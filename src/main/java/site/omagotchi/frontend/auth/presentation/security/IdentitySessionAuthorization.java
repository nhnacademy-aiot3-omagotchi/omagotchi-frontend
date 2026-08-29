package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

// Browser에는 JWT를 노출하지 않고 Redis Spring Session의 Access JWT를 사용한다.
@Component
@RequiredArgsConstructor
public class IdentitySessionAuthorization {

    private final BrowserSessionTokens browserSessionTokens;

    public String bearerToken(HttpServletRequest request) {
        return browserSessionTokens.find(request)
                .map(tokenBundle -> "Bearer " + tokenBundle.accessToken())
                .orElseThrow(() -> new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED
                ));
    }
}
