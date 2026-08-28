package site.omagotchi.frontend.account.presentation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccountSessionAuthorizationTest {

    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final AccountSessionAuthorization authorization =
            new AccountSessionAuthorization(sessionTokens);

    @Test
    @DisplayName("브라우저 세션의 원본 Access Token 조회")
    void resolvesAccessTokenWithoutAddingHttpAuthenticationScheme() {
        // Given: Access Token 묶음을 저장한 브라우저 세션
        MockHttpServletRequest request = new MockHttpServletRequest();
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2099-08-20T10:00:00Z"),
                "session-refresh-token",
                Instant.parse("2099-08-27T10:00:00Z")
        ));

        // When: 하류 서비스 호출용 Access Token 조회
        String accessToken = authorization.accessToken(request);

        // Then: HTTP 인증 Scheme이 없는 원본 Access Token
        assertThat(accessToken).isEqualTo("session-access-token");
    }

    @Test
    @DisplayName("브라우저 세션의 Access Token 누락 시 인증 필요 오류")
    void rejectsMissingSessionToken() {
        // Given: 인증 Token이 없는 브라우저 요청
        MockHttpServletRequest request = new MockHttpServletRequest();

        // When: 하류 서비스 호출용 Access Token 조회
        // Then: 인증 필요 오류
        assertThatThrownBy(() -> authorization.accessToken(request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(SecurityErrorCode.AUTHENTICATION_REQUIRED));
    }
}
