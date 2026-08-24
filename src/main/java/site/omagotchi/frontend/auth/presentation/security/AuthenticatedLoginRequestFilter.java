package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// 인증된 Browser Session의 Login 재처리 차단
public final class AuthenticatedLoginRequestFilter extends OncePerRequestFilter {

    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/login")
                .matches(request);
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            // 기존 Token Family 보존과 새 Family 발급 전 차단
            redirectStrategy.sendRedirect(
                    request,
                    response,
                    AuthenticatedLandingPage.resolve(authentication)
            );
            return;
        }
        filterChain.doFilter(request, response);
    }
}
