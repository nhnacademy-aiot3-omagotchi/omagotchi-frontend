package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

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
                    resolveReturnPath(request)
            );
            return;
        }
        filterChain.doFilter(request, response);
    }

    private String resolveReturnPath(HttpServletRequest request) {
        String referer = request.getHeader(HttpHeaders.REFERER);
        if (referer == null || referer.isBlank()) {
            return "/home";
        }

        try {
            URI refererUri = new URI(referer);
            if (refererUri.isAbsolute() && isSameOrigin(request, refererUri)) {
                return pathAndQuery(refererUri);
            }
            if (!refererUri.isAbsolute() && referer.startsWith("/") && !referer.startsWith("//")) {
                return referer;
            }
        } catch (URISyntaxException ignored) {
            return "/home";
        }

        return "/home";
    }

    private boolean isSameOrigin(HttpServletRequest request, URI refererUri) {
        int refererPort = refererUri.getPort() == -1
                ? defaultPort(refererUri.getScheme())
                : refererUri.getPort();
        int requestPort = request.getServerPort() == -1
                ? defaultPort(request.getScheme())
                : request.getServerPort();

        return request.getScheme().equalsIgnoreCase(refererUri.getScheme())
                && request.getServerName().equalsIgnoreCase(refererUri.getHost())
                && requestPort == refererPort;
    }

    private int defaultPort(String scheme) {
        return "https".equalsIgnoreCase(scheme) ? 443 : 80;
    }

    private String pathAndQuery(URI uri) {
        String path = uri.getRawPath();
        if (path == null || path.isBlank()) {
            path = "/";
        }
        return uri.getRawQuery() == null ? path : path + "?" + uri.getRawQuery();
    }
}
