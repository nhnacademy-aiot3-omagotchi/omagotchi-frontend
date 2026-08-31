package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.auth.application.AccessTokenRefreshService;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.security.SecurityErrorCode;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccessTokenRefreshInterceptorTest {

    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final AccessTokenRefreshService refreshService =
            mock(AccessTokenRefreshService.class);
    private final RefreshProbeController controller = new RefreshProbeController();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        BrowserSessionInvalidator sessionInvalidator =
                new BrowserSessionInvalidator();
        AccessTokenRefreshInterceptor interceptor = new AccessTokenRefreshInterceptor(
                refreshService,
                sessionTokens
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .addInterceptors(interceptor)
                .setControllerAdvice(new ApiExceptionHandler(sessionInvalidator))
                .build();
        controller.reset();
    }

    @Test
    @DisplayName("GET·POST BFF 요청의 Controller 최대 1회 실행")
    void runsEachOriginalControllerOnlyOnce() throws Exception {
        // Given: 현재 요청에서 그대로 사용할 Token Bundle
        BrowserSessionTokenBundle tokenBundle = tokenBundle("access-token");
        given(refreshService.refreshIfRequired(anyString(), any()))
                .willReturn(tokenBundle);

        // When: 같은 Session의 GET·POST BFF 요청
        mockMvc.perform(get("/bff/v1/test/refresh").session(session(tokenBundle)))
                .andExpectAll(status().isOk(), content().string("ok"));
        mockMvc.perform(post("/bff/v1/test/refresh").session(session(tokenBundle)))
                .andExpectAll(status().isOk(), content().string("ok"));

        // Then: 요청별 선제 확인과 원래 Controller의 각 1회 실행
        assertThat(controller.getCalls()).isEqualTo(1);
        assertThat(controller.postCalls()).isEqualTo(1);
        verify(refreshService, times(2)).refreshIfRequired(anyString(), any());
    }

    @Test
    @DisplayName("새 Bundle의 현재 요청 반영과 캐시된 HttpSession 미변경")
    void usesRefreshedBundleWithoutDirtyingCurrentHttpSession() throws Exception {
        // Given: 요청 Session의 이전 Bundle과 Redis에 명시 저장된 새 Bundle
        BrowserSessionTokenBundle previous = tokenBundle("previous-access-token");
        BrowserSessionTokenBundle refreshed = tokenBundle("refreshed-access-token");
        MockHttpSession session = session(previous);
        given(refreshService.refreshIfRequired(anyString(), any()))
                .willReturn(refreshed);

        // When: 선제 Refresh를 통과한 BFF 요청
        MvcResult result = mockMvc.perform(
                        get("/bff/v1/test/refresh").session(session)
                )
                .andExpectAll(status().isOk(), content().string("ok"))
                .andReturn();

        // Then: downstream 조회에는 새 Bundle을 제공하고 Session Snapshot은 변경하지 않음
        assertThat(session.getAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE
        )).isEqualTo(previous);
        assertThat(sessionTokens.find(result.getRequest())).contains(refreshed);
    }

    @Test
    @DisplayName("downstream 401 뒤 원래 Controller 자동 재실행 금지")
    void neverReplaysControllerAfterDownstreamUnauthorized() throws Exception {
        // Given: 선제 확인은 통과하지만 Controller의 downstream 호출이 401인 요청
        BrowserSessionTokenBundle tokenBundle = tokenBundle("access-token");
        given(refreshService.refreshIfRequired(anyString(), any()))
                .willReturn(tokenBundle);
        controller.failWithUnauthorized();

        // When: BFF GET 요청
        mockMvc.perform(get("/bff/v1/test/refresh").session(session(tokenBundle)))
                .andExpectAll(
                        status().isUnauthorized(),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED")
                );

        // Then: Refresh·Controller·downstream 경계 모두 1회
        assertThat(controller.getCalls()).isEqualTo(1);
        verify(refreshService, times(1)).refreshIfRequired(anyString(), any());
    }

    @Test
    @DisplayName("Refresh 401의 Session 무효화와 Controller 차단")
    void invalidatesSessionAndSkipsControllerForRejectedRefresh() throws Exception {
        // Given: Identity가 Refresh Token을 거절한 Session
        BrowserSessionTokenBundle tokenBundle = tokenBundle("secret-access-token");
        MockHttpSession browserSession = session(tokenBundle);
        given(refreshService.refreshIfRequired(anyString(), any()))
                .willThrow(new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED,
                        new IllegalStateException("invalid refresh token")
                ));

        // When: BFF POST 요청 진입
        mockMvc.perform(post("/bff/v1/test/refresh").session(browserSession))
                .andExpectAll(
                        status().isUnauthorized(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        jsonPath("$.code").value("AUTH_AUTHENTICATION_REQUIRED"),
                        content().string(org.hamcrest.Matchers.not(
                                org.hamcrest.Matchers.containsString("secret-access-token")
                        ))
                );

        // Then: 현재 Session 무효화와 원래 Controller 미실행
        assertThat(browserSession.isInvalid()).isTrue();
        assertThat(controller.postCalls()).isZero();
    }

    private MockHttpSession session(BrowserSessionTokenBundle tokenBundle) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE,
                tokenBundle
        );
        return session;
    }

    private static BrowserSessionTokenBundle tokenBundle(String accessToken) {
        return new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                accessToken,
                Instant.parse("2099-08-30T00:00:00Z"),
                "secret-refresh-token",
                Instant.parse("2099-09-06T00:00:00Z")
        );
    }

    @RestController
    static class RefreshProbeController {

        private final AtomicInteger getCalls = new AtomicInteger();
        private final AtomicInteger postCalls = new AtomicInteger();
        private boolean unauthorized;

        @GetMapping("/bff/v1/test/refresh")
        String get() {
            getCalls.incrementAndGet();
            requireAuthorized();
            return "ok";
        }

        @PostMapping("/bff/v1/test/refresh")
        String post() {
            postCalls.incrementAndGet();
            requireAuthorized();
            return "ok";
        }

        void failWithUnauthorized() {
            unauthorized = true;
        }

        int getCalls() {
            return getCalls.get();
        }

        int postCalls() {
            return postCalls.get();
        }

        void reset() {
            getCalls.set(0);
            postCalls.set(0);
            unauthorized = false;
        }

        private void requireAuthorized() {
            if (unauthorized) {
                throw new BusinessException(SecurityErrorCode.AUTHENTICATION_REQUIRED);
            }
        }
    }
}
