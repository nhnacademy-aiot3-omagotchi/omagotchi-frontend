package site.omagotchi.frontend.global.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.session.SessionStoreFailures;

// 브라우저 세션과 현재 요청의 인증 상태 무효화
@Slf4j
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

    public void invalidateBestEffort(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        try {
            invalidate(request, response);
        } catch (RuntimeException exception) {
            if (!SessionStoreFailures.isFailure(exception)) {
                throw exception;
            }
            // Redis 장애가 나더라도 현재 요청의 인증 정보 제거
            SecurityContextHolder.clearContext();
            log.error(
                    "Browser Session best-effort 삭제 실패 exception={}, method={}, path={}",
                    exception.getClass().getName(),
                    request.getMethod(),
                    request.getRequestURI(),
                    exception
            );
        }
    }
}
