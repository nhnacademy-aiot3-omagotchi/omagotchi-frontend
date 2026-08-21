package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;

@Component
@RequiredArgsConstructor
public class LearningSessionAuthorization {

    private final BrowserSessionTokens browserSessionTokens;

    public String bearerToken(HttpServletRequest request) {
        return browserSessionTokens.find(request)
                .map(bundle -> "Bearer " + bundle.accessToken())
                .orElseThrow(() -> new BusinessException(
                        LearningBffErrorCode.SESSION_TOKEN_MISSING
                ));
    }
}
