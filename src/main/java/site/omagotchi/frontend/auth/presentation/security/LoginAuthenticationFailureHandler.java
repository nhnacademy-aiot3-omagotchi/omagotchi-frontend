package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.DefaultRedirectStrategy;
import org.springframework.security.web.RedirectStrategy;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;

import java.io.IOException;

// Spring Security Login 실패의 HTML 응답 정책
@Slf4j
@Component
public class LoginAuthenticationFailureHandler implements AuthenticationFailureHandler {

    private final RedirectStrategy redirectStrategy = new DefaultRedirectStrategy();

    @Override
    public void onAuthenticationFailure(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull AuthenticationException exception
    ) throws IOException {
        if (exception instanceof BadCredentialsException) {
            // 원본 Identity 예외의 HTTP Session 저장 방지
            redirectStrategy.sendRedirect(request, response, "/login?error=true");
            return;
        }

        ErrorCode errorCode = exception.getCause() instanceof BusinessException businessException
                ? businessException.getErrorCode()
                : CommonErrorCode.INTERNAL_SERVER_ERROR;
        HttpStatus status = ErrorHttpMapper.toHttpStatus(errorCode.type());

        log.error(
                "Login 인증 처리 실패 error.code={}, exception={}, method={}, path={}",
                errorCode.code(),
                exception.getClass().getName(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
        response.sendError(status.value());
    }
}
