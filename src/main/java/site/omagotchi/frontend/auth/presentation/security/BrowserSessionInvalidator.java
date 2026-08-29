package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Identity의 Refresh Session 폐기 뒤 Frontend의 로그인 Session도 즉시 종료한다.
@Component
public class BrowserSessionInvalidator {

    public void invalidate(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }
}
