package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import site.omagotchi.frontend.auth.application.AccessTokenRefreshService;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

// BFF Controller 실행 전 Access Token 선제 갱신
@Component
@RequiredArgsConstructor
public class AccessTokenRefreshInterceptor implements HandlerInterceptor {

    private final AccessTokenRefreshService refreshService;
    private final BrowserSessionTokens browserSessionTokens;

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) {
        // 요청 시작 시점의 브라우저 세션 토큰 확인
        BrowserSessionTokenBundle observed = browserSessionTokens.find(request)
                .orElseThrow(() -> new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED
                ));

        BrowserSessionTokenBundle latest = refreshService.refreshIfRequired(
                request.getSession(false).getId(),
                observed
        );
        if (!observed.equals(latest)) {
            // 오래된 HttpSession을 덮어쓰지 않는 현재 요청용 토큰 교체
            browserSessionTokens.useForCurrentRequest(request, latest);
        }
        return true;
    }
}
