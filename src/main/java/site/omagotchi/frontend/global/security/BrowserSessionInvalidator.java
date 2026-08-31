package site.omagotchi.frontend.global.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Component;

@Component
public class BrowserSessionInvalidator {

    private final SecurityContextLogoutHandler logoutHandler =
            new SecurityContextLogoutHandler();

    public void invalidate(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        invalidate(
                request,
                response,
                SecurityContextHolder.getContext().getAuthentication()
        );
    }

    public void invalidate(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) {
        logoutHandler.logout(request, response, authentication);
    }
}
