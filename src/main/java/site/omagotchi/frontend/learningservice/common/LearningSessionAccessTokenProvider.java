package site.omagotchi.frontend.learningservice.common;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

// HttpOnly Browser Session에서만 Access JWT를 꺼내 Learning outbound 호출에 제공한다.
@Component
@RequiredArgsConstructor
public class LearningSessionAccessTokenProvider {

    private final BrowserSessionTokens browserSessionTokens;

    public String require(HttpServletRequest request) {
        return browserSessionTokens.find(request)
                .map(BrowserSessionTokenBundle::accessToken)
                .filter(StringUtils::hasText)
                .orElseThrow(() -> new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED
                ));
    }
}
