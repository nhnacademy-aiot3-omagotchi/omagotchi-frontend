package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

import java.util.Optional;

// 현재 요청과 브라우저 세션의 Identity 토큰 묶음 관리
@Component
public class BrowserSessionTokens {

    private static final String CURRENT_REQUEST_TOKEN_BUNDLE_ATTRIBUTE =
            "auth.currentRequestTokenBundle";

    // 로그인 성공 시 브라우저 세션에 토큰 묶음 저장
    public void save(
            HttpServletRequest request,
            BrowserSessionTokenBundle tokenBundle
    ) {
        request.getSession(true).setAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE,
                tokenBundle
        );
    }

    // 선제 갱신 뒤 현재 요청에서만 새 토큰 묶음 사용
    public void useForCurrentRequest(
            HttpServletRequest request,
            BrowserSessionTokenBundle tokenBundle
    ) {
        request.setAttribute(CURRENT_REQUEST_TOKEN_BUNDLE_ATTRIBUTE, tokenBundle);
    }

    // 현재 요청 값을 먼저 확인하는 토큰 묶음 조회
    public Optional<BrowserSessionTokenBundle> find(HttpServletRequest request) {
        Object requestAttribute = request.getAttribute(
                CURRENT_REQUEST_TOKEN_BUNDLE_ATTRIBUTE
        );
        if (requestAttribute instanceof BrowserSessionTokenBundle tokenBundle) {
            return Optional.of(tokenBundle);
        }

        HttpSession session = request.getSession(false);
        if (session == null) {
            return Optional.empty();
        }
        Object attribute = session.getAttribute(
                BrowserSessionTokenStore.SESSION_TOKEN_BUNDLE_ATTRIBUTE
        );
        return attribute instanceof BrowserSessionTokenBundle tokenBundle
                ? Optional.of(tokenBundle)
                : Optional.empty();
    }
}
