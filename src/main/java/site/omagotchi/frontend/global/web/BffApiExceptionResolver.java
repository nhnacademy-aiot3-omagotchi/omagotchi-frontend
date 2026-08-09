package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.ErrorResponse;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.handler.AbstractHandlerExceptionResolver;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Optional;

// BFF 경로의 Handler 선택·HTTP 표현 협상 오류 JSON 변환
@Component
public class BffApiExceptionResolver extends AbstractHandlerExceptionResolver {

    private final ServletApiErrorResponseWriter responseWriter;

    public BffApiExceptionResolver(ServletApiErrorResponseWriter responseWriter) {
        this.responseWriter = responseWriter;
        // Spring 기본 Resolver의 상태 응답 전 BFF JSON 계약 적용
        super.setOrder(Ordered.HIGHEST_PRECEDENCE);
    }

    @Override
    protected boolean shouldApplyTo(
            @NonNull HttpServletRequest request,
            @Nullable Object handler
    ) {
        return BffApiPaths.matches(request) && super.shouldApplyTo(request, handler);
    }

    @Override
    protected @Nullable ModelAndView doResolveException(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @Nullable Object handler,
            @NonNull Exception exception
    ) {
        if (!isBffRoutingOrMediaFailure(exception)
                || !(exception instanceof ErrorResponse errorResponse)) {
            // Controller 내부 오류와 미지원 오류의 다음 Resolver 위임
            return null;
        }

        HttpStatusCode status = errorResponse.getStatusCode();
        Optional<CommonErrorCode> errorCode = ErrorHttpMapper.findErrorCode(status);
        if (errorCode.isEmpty()) {
            return null;
        }

        try {
            responseWriter.write(
                    response,
                    status,
                    errorCode.get(),
                    request.getRequestURI(),
                    errorResponse.getHeaders()
            );
        } catch (IOException writeFailure) {
            throw new UncheckedIOException(writeFailure);
        }

        // JSON 응답 작성 완료에 따른 Resolver Chain 종료와 View 렌더링 생략
        return new ModelAndView();
    }

    // Controller 선택 전에도 발생 가능한 현재 BFF 계약의 Routing·Media 오류(404·405·406·415)
    private boolean isBffRoutingOrMediaFailure(Exception exception) {
        return exception instanceof NoHandlerFoundException
                || exception instanceof NoResourceFoundException
                || exception instanceof HttpRequestMethodNotSupportedException
                || exception instanceof HttpMediaTypeNotAcceptableException
                || exception instanceof HttpMediaTypeNotSupportedException;
    }
}
