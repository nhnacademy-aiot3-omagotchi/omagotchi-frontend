package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.domain.GlobalRole;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentityLogoutHandlerTest {

    @Test
    @DisplayName("Browser Session Token Bundle의 Identity 폐기 전달")
    void revokesIdentityTokenFromBrowserSession() {
        // Given: Browser Session Token Bundle
        MockHttpServletRequest request = new MockHttpServletRequest();
        BrowserSessionTokenBundle tokenBundle = validTokenBundle();
        BrowserSessionTokens browserSessionTokens = new BrowserSessionTokens();
        browserSessionTokens.save(request, tokenBundle);
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        IdentityLogoutHandler handler = new IdentityLogoutHandler(
                new AuthenticationService(identityAuthClient),
                browserSessionTokens
        );

        // When: Logout Handler 실행
        handler.logout(
                request,
                new MockHttpServletResponse(),
                new TestingAuthenticationToken("user", "password")
        );

        // Then: Identity Token 폐기 Use Case 호출
        assertThat(identityAuthClient.logoutRefreshToken)
                .isEqualTo(tokenBundle.refreshToken());
    }

    @Test
    @DisplayName("Identity 폐기 실패와 무관한 Logout Handler 완료")
    void completesWhenIdentityRevocationFails() {
        // Given: Browser Session Token Bundle과 Identity 폐기 실패
        MockHttpServletRequest request = new MockHttpServletRequest();
        BrowserSessionTokenBundle tokenBundle = validTokenBundle();
        BrowserSessionTokens browserSessionTokens = new BrowserSessionTokens();
        browserSessionTokens.save(request, tokenBundle);
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        identityAuthClient.logoutFailure =
                new IllegalStateException("Identity 호출 실패");
        IdentityLogoutHandler handler = new IdentityLogoutHandler(
                new AuthenticationService(identityAuthClient),
                browserSessionTokens
        );

        // When: Logout Handler 실행
        // Then: 상위 Spring Security Logout 흐름 유지
        assertThatCode(() -> handler.logout(
                request,
                new MockHttpServletResponse(),
                new TestingAuthenticationToken("user", "password")
        )).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Redis Session 장애의 바깥 Filter 전파")
    void propagatesSessionStoreFailure() {
        // Given: HTTP Session 조회의 Redis 연결 실패
        RuntimeException failure = new IllegalStateException(
                "Session 조회 실패",
                new RedisConnectionFailureException("Redis 연결 실패")
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        BrowserSessionTokens browserSessionTokens = new BrowserSessionTokens() {
            @Override
            public Optional<BrowserSessionTokenBundle> find(
                    jakarta.servlet.http.HttpServletRequest httpRequest
            ) {
                throw failure;
            }
        };
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        IdentityLogoutHandler handler = new IdentityLogoutHandler(
                new AuthenticationService(identityAuthClient),
                browserSessionTokens
        );

        // When: Logout Handler 실행
        // Then: SessionStoreErrorFilter 대상 예외 유지
        assertThatThrownBy(() -> handler.logout(
                request,
                new MockHttpServletResponse(),
                new TestingAuthenticationToken("user", "password")
        )).isSameAs(failure);
        assertThat(identityAuthClient.logoutRefreshToken).isNull();
    }

    private BrowserSessionTokenBundle validTokenBundle() {
        return new BrowserSessionTokenBundle(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2099-01-01T00:00:00Z"),
                "refresh-token",
                Instant.parse("2099-01-02T00:00:00Z")
        );
    }

    // Logout 폐기 요청 관찰만을 위한 파일 내부 Identity fake
    private static final class RecordingIdentityAuthClient implements IdentityAuthClient {

        private String logoutRefreshToken;
        private RuntimeException logoutFailure;

        @Override
        public SignupResult signUp(String email, String password, String name) {
            throw new UnsupportedOperationException();
        }

        @Override
        public BrowserSessionTokenBundle login(String email, String password) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void logout(String refreshToken) {
            if (logoutFailure != null) {
                throw logoutFailure;
            }
            logoutRefreshToken = refreshToken;
        }
    }
}
