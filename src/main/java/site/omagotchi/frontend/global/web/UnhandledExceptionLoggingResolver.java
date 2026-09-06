package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;
import site.omagotchi.frontend.global.session.SessionStoreFailures;

/** MVC 기본 예외 처리 뒤에도 남은 오류의 기록과 기존 Boot 오류 응답 유지. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
public class UnhandledExceptionLoggingResolver implements HandlerExceptionResolver {

    private final HttpErrorEventLogger errorEventLogger;

    @Override
    public @Nullable ModelAndView resolveException(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @Nullable Object handler,
            @NonNull Exception exception
    ) {
        // 인증·인가 실패와 Redis 장애는 바깥 Security·Session Filter의 처리 대상
        if (exception instanceof AuthenticationException
                || exception instanceof AccessDeniedException
                || SessionStoreFailures.isFailure(exception)) {
            return null;
        }
        this.errorEventLogger.log(
                exception,
                CommonErrorCode.INTERNAL_SERVER_ERROR,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                request
        );
        // 응답 작성 없이 원본 예외 전파. Boot /error의 HTML·상태 처리 유지
        return null;
    }
}
