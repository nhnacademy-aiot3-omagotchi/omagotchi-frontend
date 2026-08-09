package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

import java.util.Optional;

// Spring Session이 Redis에 저장할 Identity Token Session attribute 관리
@Component
public class BrowserSessionTokens {

    private static final String TOKEN_BUNDLE_SESSION_ATTRIBUTE =
            BrowserSessionTokens.class.getName() + ".TOKEN_BUNDLE";

    public void save(
            HttpServletRequest request,
            BrowserSessionTokenBundle tokenBundle
    ) {
        request.getSession(true).setAttribute(
                TOKEN_BUNDLE_SESSION_ATTRIBUTE,
                tokenBundle
        );
    }

    public Optional<BrowserSessionTokenBundle> find(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return Optional.empty();
        }
        Object attribute = session.getAttribute(TOKEN_BUNDLE_SESSION_ATTRIBUTE);
        return attribute instanceof BrowserSessionTokenBundle tokenBundle
                ? Optional.of(tokenBundle)
                : Optional.empty();
    }
}
