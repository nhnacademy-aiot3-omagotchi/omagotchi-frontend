package site.omagotchi.frontend.auth.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.http.server.LocalTestWebServer;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.infrastructure.SpringSessionBrowserSessionTokenStore;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
@Import({
        AccessTokenRefreshRedisIT.HttpClientConfiguration.class,
        AccessTokenRefreshRedisIT.RefreshProbeController.class
})
class AccessTokenRefreshRedisIT {

    private static final String SESSION_COOKIE = "OMAGOTCHI_SESSION";
    private static final String PREVIOUS_ACCESS_TOKEN = "previous-secret-access-token";
    private static final String PREVIOUS_REFRESH_TOKEN = "previous-secret-refresh-token";
    private static final String NEW_ACCESS_TOKEN = "new-secret-access-token";
    private static final String NEW_REFRESH_TOKEN = "new-secret-refresh-token";

    @SuppressWarnings("resource")
    @Container
    @ServiceConnection(name = "redis")
    private static final GenericContainer<?> REDIS = new GenericContainer<>(
            DockerImageName.parse("redis:7.4-alpine")
    ).withExposedPorts(6379);

    @Autowired
    private RestTestClient restTestClient;

    @Autowired
    private SessionRepository<? extends Session> sessionRepository;

    @Autowired
    private RefreshProbeController probeController;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @MockitoSpyBean
    private SpringSessionBrowserSessionTokenStore tokenStore;

    @BeforeEach
    void resetProbe() {
        probeController.reset();
    }

    @Test
    @DisplayName("동일 Cookie 동시 요청의 단일 Refresh와 오래된 Bundle 덮어쓰기 방지")
    void refreshesOnlyOnceAndPreventsStaleBundleOverwrite() throws Exception {
        // Given: Redis에 저장된 만료 임박 Browser Session과 읽기만 한 오래된 요청 Snapshot
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        BrowserSession browserSession = createSession(expiring);
        Session staleRequestSession = findSession(browserSession.id());
        BrowserSessionTokenBundle staleBundle = staleRequestSession.getAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE
        );
        staleRequestSession.setLastAccessedTime(Instant.now());
        assertThat(staleBundle).isEqualTo(expiring);

        CountDownLatch refreshStarted = new CountDownLatch(1);
        CountDownLatch releaseRefresh = new CountDownLatch(1);
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willAnswer(invocation -> {
                    refreshStarted.countDown();
                    assertThat(releaseRefresh.await(5, TimeUnit.SECONDS)).isTrue();
                    return refreshed;
                });

        // When: 동일 Cookie의 두 요청이 동시에 만료 임박 Access Token을 확인
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<EntityExchangeResult<String>> first = executor.submit(() ->
                    sendProbe(browserSession.cookieValue())
            );
            assertThat(refreshStarted.await(5, TimeUnit.SECONDS)).isTrue();
            Future<EntityExchangeResult<String>> second = executor.submit(() ->
                    sendProbe(browserSession.cookieValue())
            );
            releaseRefresh.countDown();

            EntityExchangeResult<String> firstResponse = first.get(5, TimeUnit.SECONDS);
            EntityExchangeResult<String> secondResponse = second.get(5, TimeUnit.SECONDS);

            // Then: 요청별 Controller 1회와 Session 단위 Identity Refresh 1회
            assertThat(firstResponse.getStatus().value()).isEqualTo(HttpStatus.NO_CONTENT.value());
            assertThat(secondResponse.getStatus().value()).isEqualTo(HttpStatus.NO_CONTENT.value());
            assertThat(probeController.calls()).isEqualTo(2);
            assertThat(probeController.accessTokens())
                    .containsOnly(NEW_ACCESS_TOKEN)
                    .hasSize(2);
            verify(identityAuthClient, times(1)).refresh(PREVIOUS_REFRESH_TOKEN);
            assertTokensAreNotExposed(firstResponse);
            assertTokensAreNotExposed(secondResponse);
        }

        // Then: 읽기만 한 오래된 Session 저장 뒤에도 새 Bundle 유지
        assertStoredTokenBundle(browserSession.id(), refreshed);
        saveSession(sessionRepository, staleRequestSession);
        assertStoredTokenBundle(browserSession.id(), refreshed);
    }

    @Test
    @DisplayName("명시적인 Identity Refresh 503의 Session 유지와 Controller 차단")
    void keepsSessionForExplicitRefreshServiceUnavailable() {
        // Given: 만료 임박 Session과 Identity의 정상적인 HTTP 503 결과
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSession browserSession = createSession(expiring);
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE));

        // When: BFF 요청 진입 단계의 선제 Refresh
        EntityExchangeResult<String> response = sendProbe(browserSession.cookieValue());

        // Then: 원래 Controller 미실행·기존 Session 유지·JSON 503
        assertThat(response.getStatus().value())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(probeController.calls()).isZero();
        assertStoredTokenBundle(browserSession.id(), expiring);
        assertThat(response.getResponseCookies().getFirst(SESSION_COOKIE)).isNull();
        verify(identityAuthClient, times(1)).refresh(PREVIOUS_REFRESH_TOKEN);
        assertTokensAreNotExposed(response);
    }

    @Test
    @DisplayName("명시적인 Identity Refresh 401의 Session·Cookie 폐기")
    void invalidatesSessionForRejectedRefreshToken() {
        // Given: 만료 임박 Session과 Identity의 명시적인 Refresh Token 거절
        BrowserSession browserSession = createSession(expiringTokenBundle());
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willThrow(new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN));

        // When: BFF 요청 진입 단계의 선제 Refresh
        EntityExchangeResult<String> response = sendProbe(browserSession.cookieValue());

        // Then: Controller 미실행·Redis Session 삭제·Cookie 만료·JSON 401
        assertThat(response.getStatus().value()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(probeController.calls()).isZero();
        assertThat(sessionRepository.findById(browserSession.id())).isNull();
        ResponseCookie expired = response.getResponseCookies().getFirst(SESSION_COOKIE);
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        verify(identityAuthClient, times(1)).refresh(PREVIOUS_REFRESH_TOKEN);
        assertTokensAreNotExposed(response);
    }

    @Test
    @DisplayName("Identity Refresh 응답 계약 위반의 Session·Cookie 폐기")
    void invalidatesSessionForInvalidRefreshResponse() {
        // Given: 만료 임박 Session과 신뢰할 수 없는 Identity Refresh 응답
        BrowserSession browserSession = createSession(expiringTokenBundle());
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willThrow(new BusinessException(
                        CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE
                ));

        // When: BFF 요청 진입 단계의 선제 Refresh
        EntityExchangeResult<String> response = sendProbe(browserSession.cookieValue());

        // Then: Controller 미실행·Redis Session 삭제·Cookie 만료·JSON 401
        assertThat(response.getStatus().value()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(probeController.calls()).isZero();
        assertThat(sessionRepository.findById(browserSession.id())).isNull();
        ResponseCookie expired = response.getResponseCookies().getFirst(SESSION_COOKIE);
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        verify(identityAuthClient, times(1)).refresh(PREVIOUS_REFRESH_TOKEN);
        assertTokensAreNotExposed(response);
    }

    @Test
    @DisplayName("새 Bundle 저장 결과 불명확의 Session·Cookie 폐기")
    void invalidatesSessionWhenNewBundleSaveIsUncertain() {
        // Given: Identity Token 회전 성공 뒤 Redis Session 저장 결과 불명확
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        BrowserSession browserSession = createSession(expiringTokenBundle());
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willReturn(refreshed);
        willAnswer(invocation -> {
            invocation.callRealMethod();
            throw new BrowserSessionStoreUnavailableException(
                    new IllegalStateException("save response lost")
            );
        }).given(tokenStore).save(eq(browserSession.id()), eq(refreshed));

        // When: BFF 요청 진입 단계의 선제 Refresh
        EntityExchangeResult<String> response = sendProbe(browserSession.cookieValue());

        // Then: 이전 Bundle 재사용 없이 Controller 차단·Session 삭제·Cookie 만료
        assertThat(response.getStatus().value()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(probeController.calls()).isZero();
        assertThat(sessionRepository.findById(browserSession.id())).isNull();
        ResponseCookie expired = response.getResponseCookies().getFirst(SESSION_COOKIE);
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        verify(identityAuthClient, times(1)).refresh(PREVIOUS_REFRESH_TOKEN);
        assertTokensAreNotExposed(response);
    }

    @Test
    @DisplayName("Refresh 응답 미수신 뒤 Session 유지와 후속 요청 재시도")
    void keepsSessionAndAllowsLaterRetryAfterMissingResponse(CapturedOutput output) {
        // Given: 첫 Identity 응답 미수신과 다음 요청의 정상 Refresh 응답
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        BrowserSession browserSession = createSession(expiring);
        given(identityAuthClient.refresh(PREVIOUS_REFRESH_TOKEN))
                .willThrow(new BusinessException(
                        CommonErrorCode.SERVICE_UNAVAILABLE,
                        new ResourceAccessException("response lost")
                ))
                .willReturn(refreshed);

        // When: 첫 Browser 요청에서 Refresh 응답을 받지 못함
        EntityExchangeResult<String> first = sendProbe(browserSession.cookieValue());

        // Then: Controller 미실행·Session 유지·Cookie 만료 없는 503
        assertThat(first.getStatus().value()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(probeController.calls()).isZero();
        assertStoredTokenBundle(browserSession.id(), expiring);
        assertThat(first.getResponseCookies().getFirst(SESSION_COOKIE)).isNull();

        // When: 다음 Browser 요청이 유지된 Session으로 다시 진입
        EntityExchangeResult<String> second = sendProbe(browserSession.cookieValue());

        // Then: 후속 요청만 Refresh를 재시도하고 새 Bundle 사용
        assertThat(second.getStatus().value()).isEqualTo(HttpStatus.NO_CONTENT.value());
        assertThat(probeController.calls()).isEqualTo(1);
        assertStoredTokenBundle(browserSession.id(), refreshed);
        verify(identityAuthClient, times(2)).refresh(PREVIOUS_REFRESH_TOKEN);
        assertTokensAreNotExposed(first);
        assertTokensAreNotExposed(second);
        assertThat(output)
                .doesNotContain(PREVIOUS_ACCESS_TOKEN)
                .doesNotContain(PREVIOUS_REFRESH_TOKEN)
                .doesNotContain(NEW_ACCESS_TOKEN)
                .doesNotContain(NEW_REFRESH_TOKEN);
    }

    private BrowserSession createSession(BrowserSessionTokenBundle tokenBundle) {
        Session session = sessionRepository.createSession();
        session.setAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE,
                tokenBundle
        );
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        tokenBundle.userId().toString(),
                        null,
                        List.of(new SimpleGrantedAuthority(
                                "ROLE_" + tokenBundle.globalRole().name()
                        ))
                );
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                securityContext
        );
        saveSession(sessionRepository, session);
        String cookieValue = Base64.getEncoder().encodeToString(
                session.getId().getBytes(StandardCharsets.UTF_8)
        );
        return new BrowserSession(session.getId(), cookieValue);
    }

    private EntityExchangeResult<String> sendProbe(String sessionCookie) {
        return restTestClient.get()
                .uri("/bff/v1/test/access-token-refresh")
                .cookie(SESSION_COOKIE, sessionCookie)
                .exchange()
                .expectBody(String.class)
                .returnResult();
    }

    private Session findSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId);
        assertThat(session).isNotNull();
        return session;
    }

    private void assertStoredTokenBundle(
            String sessionId,
            BrowserSessionTokenBundle expected
    ) {
        BrowserSessionTokenBundle stored = findSession(sessionId).getAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE
        );
        assertThat(stored).isEqualTo(expected);
    }

    private void assertTokensAreNotExposed(EntityExchangeResult<String> response) {
        if (response.getResponseBody() != null) {
            assertThat(response.getResponseBody()).doesNotContain(
                    PREVIOUS_ACCESS_TOKEN,
                    PREVIOUS_REFRESH_TOKEN,
                    NEW_ACCESS_TOKEN,
                    NEW_REFRESH_TOKEN
            );
        }
        response.getResponseHeaders().forEach((name, values) -> values.forEach(value ->
                assertThat(value).doesNotContain(
                        PREVIOUS_ACCESS_TOKEN,
                        PREVIOUS_REFRESH_TOKEN,
                        NEW_ACCESS_TOKEN,
                        NEW_REFRESH_TOKEN
                )
        ));
    }

    private static <S extends Session> void saveSession(
            SessionRepository<S> repository,
            Session session
    ) {
        @SuppressWarnings("unchecked")
        S typedSession = (S) session;
        repository.save(typedSession);
    }

    private static BrowserSessionTokenBundle expiringTokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                PREVIOUS_ACCESS_TOKEN,
                Instant.now().plusSeconds(5),
                PREVIOUS_REFRESH_TOKEN,
                Instant.now().plus(Duration.ofDays(7))
        );
    }

    private static BrowserSessionTokenBundle refreshedTokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                NEW_ACCESS_TOKEN,
                Instant.now().plus(Duration.ofMinutes(15)),
                NEW_REFRESH_TOKEN,
                Instant.now().plus(Duration.ofDays(7))
        );
    }

    private record BrowserSession(String id, String cookieValue) {
    }

    @RestController
    static class RefreshProbeController {

        private final AtomicInteger calls = new AtomicInteger();
        private final ConcurrentLinkedQueue<String> accessTokens =
                new ConcurrentLinkedQueue<>();
        private final BrowserSessionTokens browserSessionTokens;

        RefreshProbeController(BrowserSessionTokens browserSessionTokens) {
            this.browserSessionTokens = browserSessionTokens;
        }

        @GetMapping("/bff/v1/test/access-token-refresh")
        org.springframework.http.ResponseEntity<Void> probe(HttpServletRequest request) {
            calls.incrementAndGet();
            browserSessionTokens.find(request)
                    .map(BrowserSessionTokenBundle::accessToken)
                    .ifPresent(accessTokens::add);
            return org.springframework.http.ResponseEntity.noContent().build();
        }

        int calls() {
            return calls.get();
        }

        List<String> accessTokens() {
            return List.copyOf(accessTokens);
        }

        void reset() {
            calls.set(0);
            accessTokens.clear();
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class HttpClientConfiguration {

        @Bean
        RestTestClient restTestClient(ApplicationContext applicationContext) {
            return RestTestClient
                    .bindToServer(new JdkClientHttpRequestFactory())
                    .uriBuilderFactory(
                            LocalTestWebServer.get(applicationContext).uriBuilderFactory()
                    )
                    .build();
        }
    }
}
