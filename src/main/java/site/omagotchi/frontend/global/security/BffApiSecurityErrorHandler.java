package site.omagotchi.frontend.global.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;

import java.io.IOException;

// DispatcherServlet 이전 BFF 인증·인가 실패의 공통 JSON 변환
@Component
@RequiredArgsConstructor
public class BffApiSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ServletApiErrorResponseWriter responseWriter;

    @Override
    public void commence(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull AuthenticationException exception
    ) throws IOException {
        responseWriter.write(
                response,
                HttpStatus.UNAUTHORIZED,
                SecurityErrorCode.AUTHENTICATION_REQUIRED,
                request.getRequestURI()
        );
    }

    @Override
    public void handle(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull AccessDeniedException exception
    ) throws IOException {
        SecurityErrorCode errorCode = exception instanceof CsrfException
                ? SecurityErrorCode.CSRF_INVALID
                : SecurityErrorCode.ACCESS_DENIED;
        responseWriter.write(
                response,
                HttpStatus.FORBIDDEN,
                errorCode,
                request.getRequestURI()
        );
    }
}
