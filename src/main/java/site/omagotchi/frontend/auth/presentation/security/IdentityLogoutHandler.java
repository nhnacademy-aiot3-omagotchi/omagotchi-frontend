package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.global.exception.BusinessException;

// Logout 전 Browser Session Refresh Token 폐기 시도
@Slf4j
@Component
@RequiredArgsConstructor
public class IdentityLogoutHandler implements LogoutHandler {

    private final AuthenticationService authenticationService;
    private final BrowserSessionTokens browserSessionTokens;

    @Override
    public void logout(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            Authentication authentication
    ) {
        // Session 조회 실패의 상위 SessionStoreErrorFilter 전파
        browserSessionTokens.find(request)
                .ifPresent(this::revokeIdentityToken);
    }

    // Local Session 정리와 분리된 Identity Token 폐기 시도
    private void revokeIdentityToken(BrowserSessionTokenBundle tokenBundle) {
        try {
            authenticationService.logout(tokenBundle);
        } catch (BusinessException exception) {
            // Identity 폐기 실패와 무관한 Browser Session 정리
            log.error(
                    "Identity logout 실패 error.code={}",
                    exception.getErrorCode().code(),
                    exception
            );
        } catch (RuntimeException exception) {
            // 예상하지 못한 Identity 호출 실패와 무관한 Browser Session 정리
            log.error("Identity logout 예상 외 실패", exception);
        }
    }
}
