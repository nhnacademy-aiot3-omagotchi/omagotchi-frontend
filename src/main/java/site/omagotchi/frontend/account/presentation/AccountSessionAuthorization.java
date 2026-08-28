package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

@Component
@RequiredArgsConstructor
public class AccountSessionAuthorization {

    private final BrowserSessionTokens browserSessionTokens;

    public String accessToken(HttpServletRequest request) {
        return browserSessionTokens.find(request)
                .map(BrowserSessionTokenBundle::accessToken)
                .orElseThrow(() -> new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED
                ));
    }
}
