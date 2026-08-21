package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.session.SessionStoreFailures;
import site.omagotchi.frontend.learning.infrastructure.LearningDownstreamException;

import java.util.Optional;

// @RestController 예외의 Frontend 공통 JSON 오류 응답 변환
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE) // HTML 예외 처리기보다 REST JSON 예외 처리 우선
@RestControllerAdvice(annotations = RestController.class)
@NullMarked
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    // 클라이언트 공개 ErrorCode와 응답 방식이 확정된 실패 처리
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessException(
            BusinessException exception,
            HttpServletRequest request
    ) {
        if (ErrorHttpMapper.toHttpStatus(exception.getErrorCode().type()).is5xxServerError()) {
            logServerFailure(exception, exception.getErrorCode(), request);
        }
        return response(exception.getErrorCode(), request);
    }

    @ExceptionHandler(LearningDownstreamException.class)
    public ResponseEntity<ApiErrorResponse> handleLearningDownstreamException(
            LearningDownstreamException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();
        ApiErrorResponse response = new ApiErrorResponse(
                downstream.code(),
                downstream.message(),
                request.getRequestURI(),
                downstream.requestId()
        );
        return ResponseEntity.status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(response);
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        // 첫 번째 Bean Validation 필드 오류 메시지 선택
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .filter(error -> error.getDefaultMessage() != null)
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .orElse(CommonErrorCode.INVALID_REQUEST.message());

        return frameworkResponse(
                exception,
                CommonErrorCode.INVALID_REQUEST,
                message,
                headers,
                statusCode,
                request
        );
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        // 읽을 수 없는 요청 본문의 공통 오류 변환
        return frameworkResponse(
                exception,
                CommonErrorCode.MALFORMED_REQUEST,
                CommonErrorCode.MALFORMED_REQUEST.message(),
                headers,
                statusCode,
                request
        );
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            @Nullable Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        // 나머지 Spring MVC 예외의 공통 JSON 오류 변환
        Optional<CommonErrorCode> mappedErrorCode = ErrorHttpMapper.findErrorCode(statusCode);
        if (mappedErrorCode.isEmpty()) {
            HttpServletRequest servletRequest = ((ServletWebRequest) request).getRequest();
            logFrameworkContractViolation(exception, statusCode, servletRequest);
            return frameworkResponse(
                    exception,
                    CommonErrorCode.INTERNAL_SERVER_ERROR,
                    CommonErrorCode.INTERNAL_SERVER_ERROR.message(),
                    new HttpHeaders(),
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    request
            );
        }

        ErrorCode errorCode = mappedErrorCode.get();

        if (statusCode.is5xxServerError()) {
            logServerFailure(
                    exception,
                    errorCode,
                    ((ServletWebRequest) request).getRequest()
            );
        }
        return frameworkResponse(
                exception,
                errorCode,
                errorCode.message(),
                headers,
                statusCode,
                request
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
    ) {
        // 바깥 SessionStoreErrorFilter까지 Redis Session 장애 재전파
        if (SessionStoreFailures.isFailure(exception)
                && exception instanceof RuntimeException runtimeException) {
            throw runtimeException;
        }

        // 처리 규칙이 없는 예외의 상세 정보 은닉과 500 응답
        logServerFailure(exception, CommonErrorCode.INTERNAL_SERVER_ERROR, request);
        return response(CommonErrorCode.INTERNAL_SERVER_ERROR, request);
    }

    private @Nullable ResponseEntity<Object> frameworkResponse(
            Exception exception,
            ErrorCode errorCode,
            String message,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        // Spring MVC HTTP 상태·Header와 공통 오류 본문 결합
        ApiErrorResponse body = ApiErrorResponse.of(
                errorCode,
                message,
                ((ServletWebRequest) request).getRequest().getRequestURI()
        );
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.putAll(headers);
        responseHeaders.setCacheControl(CacheControl.noStore());
        return super.handleExceptionInternal(
                exception,
                body,
                responseHeaders,
                statusCode,
                request
        );
    }

    private void logServerFailure(
            Exception exception,
            ErrorCode errorCode,
            HttpServletRequest request
    ) {
        log.error(
                "서버 오류 error.code={}, exception={}, method={}, path={}",
                errorCode.code(),
                exception.getClass().getName(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
    }

    private void logFrameworkContractViolation(
            Exception exception,
            HttpStatusCode statusCode,
            HttpServletRequest request
    ) {
        log.error(
                "Spring MVC 오류 응답 계약 위반 status={}, exception={}, method={}, path={}",
                statusCode.value(),
                exception.getClass().getName(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
    }

    private ResponseEntity<ApiErrorResponse> response(
            ErrorCode errorCode,
            HttpServletRequest request
    ) {
        HttpStatus status = ErrorHttpMapper.toHttpStatus(errorCode.type());
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(ApiErrorResponse.of(
                        errorCode,
                        request.getRequestURI()
                ));
    }
}
