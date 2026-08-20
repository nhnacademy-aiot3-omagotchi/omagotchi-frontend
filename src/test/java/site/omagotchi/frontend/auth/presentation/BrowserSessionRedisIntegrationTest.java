package site.omagotchi.frontend.auth.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.http.server.LocalTestWebServer;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;

import java.time.Instant;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
@Import(BrowserSessionRedisIntegrationTest.HttpClientConfiguration.class)
class BrowserSessionRedisIntegrationTest {

    private static final String SESSION_COOKIE = "OMAGOTCHI_SESSION";
    private static final String ACCESS_JWT =
            "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTAwMDAwMDAwIn0.signature";
    private static final String REFRESH_TOKEN = "refresh-token-for-browser-session";
    // Attribute 순서와 무관한 Thymeleaf CSRF Hidden Input 추출
    private static final Pattern CSRF_INPUT = Pattern.compile(
            "<input\\b(?=[^>]*\\bname=[\\\"']_csrf[\\\"'])"
                    + "(?=[^>]*\\bvalue=[\\\"']([^\\\"']+)[\\\"'])[^>]*>",
            Pattern.CASE_INSENSITIVE
    );

    // Testcontainers Extension 관리 Container 수명
    @SuppressWarnings("resource")
    @Container
    @ServiceConnection(name = "redis")
    private static final GenericContainer<?> REDIS = new GenericContainer<>(
            DockerImageName.parse("redis:7.4-alpine")
    ).withExposedPorts(6379);

    @Autowired
    private RestTestClient restTestClient;

    @MockitoBean
    private IdentityAuthClient identityAuthClient;

    @Test
    @DisplayName("Redis Browser Session 로그인·인증 복원·로그아웃")
    void restoresAuthenticationAndInvalidatesSession() {
        // Given: Identity Login Token Bundle
        given(identityAuthClient.login("user@example.com", "password-passphrase"))
                .willReturn(tokenBundle());

        // Given: Login Form의 CSRF Token과 익명 Session Cookie
        EntityExchangeResult<String> loginPageResponse = sendGet("/login", null);
        String anonymousCsrfToken = csrfToken(loginPageResponse);
        ResponseCookie anonymousSessionCookie = sessionCookie(loginPageResponse);
        assertThat(anonymousSessionCookie.isHttpOnly()).isTrue();
        assertThat(anonymousSessionCookie.getSameSite()).isEqualToIgnoringCase("Lax");

        // When: Identity 로그인 결과의 Redis Session 저장
        EntityExchangeResult<String> loginResponse = sendLogin(
                anonymousCsrfToken,
                anonymousSessionCookie.getValue()
        );
        ResponseCookie authenticatedSessionCookie = sessionCookie(loginResponse);

        // Then: Session ID 교체와 Browser 응답의 Token 비노출
        assertThat(loginResponse.getStatus().value()).isEqualTo(302);
        assertThat(loginResponse.getResponseHeaders().getLocation())
                .hasPath("/home");
        assertThat(authenticatedSessionCookie.getValue())
                .isNotEqualTo(anonymousSessionCookie.getValue());
        assertThat(authenticatedSessionCookie.isHttpOnly()).isTrue();
        assertThat(authenticatedSessionCookie.getSameSite()).isEqualToIgnoringCase("Lax");
        assertTokensAreNotExposed(loginResponse);

        // When: 새 HTTP 요청의 SecurityContext 복원
        EntityExchangeResult<String> authenticatedHomeResponse = sendGet(
                "/home",
                authenticatedSessionCookie.getValue()
        );

        // Then: Redis Session 기반 인증 복원과 새 CSRF Token 제공
        assertThat(authenticatedHomeResponse.getStatus().value()).isEqualTo(200);
        String authenticatedCsrfToken = csrfToken(authenticatedHomeResponse);
        assertTokensAreNotExposed(authenticatedHomeResponse);

        // When: Login 전 CSRF Token의 인증 Session 재사용
        EntityExchangeResult<String> staleCsrfLogoutResponse = sendLogout(
                anonymousCsrfToken,
                authenticatedSessionCookie.getValue()
        );

        // Then: Login 성공 시점 CSRF Token 폐기
        assertThat(staleCsrfLogoutResponse.getStatus().value()).isEqualTo(403);
        verify(identityAuthClient, never()).logout(anyString());

        // When: 인증 Session의 새 CSRF Token 로그아웃
        EntityExchangeResult<String> logoutResponse = sendLogout(
                authenticatedCsrfToken,
                authenticatedSessionCookie.getValue()
        );

        // Then: 복원된 Refresh Token 폐기 요청과 이전 Session 인증 차단
        assertThat(logoutResponse.getStatus().value()).isEqualTo(302);
        assertThat(logoutResponse.getResponseHeaders().getLocation())
                .hasPath("/login");
        verify(identityAuthClient).logout(REFRESH_TOKEN);
        assertTokensAreNotExposed(logoutResponse);
        EntityExchangeResult<String> loggedOutHomeResponse = sendGet(
                "/home",
                authenticatedSessionCookie.getValue()
        );
        assertThat(loggedOutHomeResponse.getStatus().value()).isEqualTo(302);
        assertThat(loggedOutHomeResponse.getResponseHeaders().getLocation())
                .hasPath("/login");
    }

    private EntityExchangeResult<String> sendLogin(
            String csrfToken,
            String sessionCookie
    ) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("_csrf", csrfToken);
        form.add("email", "user@example.com");
        form.add("password", "password-passphrase");

        return restTestClient.post()
                .uri("/login")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .cookie(SESSION_COOKIE, sessionCookie)
                .body(form)
                .exchange()
                .expectBody(String.class)
                .returnResult();
    }

    private EntityExchangeResult<String> sendLogout(
            String csrfToken,
            String sessionCookie
    ) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("_csrf", csrfToken);

        return restTestClient.post()
                .uri("/logout")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .cookie(SESSION_COOKIE, sessionCookie)
                .body(form)
                .exchange()
                .expectBody(String.class)
                .returnResult();
    }

    private EntityExchangeResult<String> sendGet(
            String path,
            String sessionCookie
    ) {
        RestTestClient.RequestHeadersSpec<?> request = restTestClient.get().uri(path);
        if (sessionCookie != null) {
            request.cookie(SESSION_COOKIE, sessionCookie);
        }
        return request.exchange()
                .expectBody(String.class)
                .returnResult();
    }

    private String csrfToken(EntityExchangeResult<String> response) {
        assertThat(response.getStatus().value()).isEqualTo(200);
        assertThat(response.getResponseBody()).isNotNull();
        Matcher matcher = CSRF_INPUT.matcher(response.getResponseBody());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private void assertTokensAreNotExposed(EntityExchangeResult<String> response) {
        if (response.getResponseBody() != null) {
            assertThat(response.getResponseBody()).doesNotContain(ACCESS_JWT, REFRESH_TOKEN);
        }
        response.getResponseHeaders().forEach((name, values) -> values.forEach(value ->
                assertThat(value).doesNotContain(ACCESS_JWT, REFRESH_TOKEN)
        ));
    }

    private ResponseCookie sessionCookie(EntityExchangeResult<String> response) {
        ResponseCookie cookie = response.getResponseCookies().getFirst(SESSION_COOKIE);
        assertThat(cookie).as(SESSION_COOKIE + " Set-Cookie").isNotNull();
        return cookie;
    }

    private BrowserSessionTokenBundle tokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                ACCESS_JWT,
                Instant.parse("2099-08-02T15:15:00Z"),
                REFRESH_TOKEN,
                Instant.parse("2099-08-09T15:00:00Z")
        );
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class HttpClientConfiguration {

        // 실제 Server·Redis 경계와 302 응답 확인용 Redirect 미추적 HTTP Client
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
