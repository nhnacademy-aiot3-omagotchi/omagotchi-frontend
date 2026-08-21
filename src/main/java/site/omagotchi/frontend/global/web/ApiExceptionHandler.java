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

import java.util.Map;
import java.util.Optional;

// @RestController 예외의 Frontend 공통 JSON 오류 응답 변환
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE) // HTML 예외 처리기보다 REST JSON 예외 처리 우선
@RestControllerAdvice(annotations = RestController.class)
@NullMarked
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Map<String, Integer> PUBLIC_LEARNING_DOWNSTREAM_ERRORS = Map.ofEntries(
            Map.entry("COMMON_INVALID_REQUEST", 400),
            Map.entry("COMMON_MALFORMED_REQUEST", 400),
            Map.entry("AUTH_AUTHENTICATION_REQUIRED", 401),
            Map.entry("AUTH_ACCESS_DENIED", 403),
            Map.entry("COHORT_INVALID_PERIOD", 400),
            Map.entry("COHORT_INVALID_STATUS_TRANSITION", 400),
            Map.entry("MEMBERSHIP_INVALID_STATUS_TRANSITION", 400),
            Map.entry("MEMBERSHIP_REJECTION_REASON_REQUIRED", 400),
            Map.entry("JOIN_CODE_REQUIRED", 400),
            Map.entry("JOIN_CODE_EXPIRES_AT_INVALID", 400),
            Map.entry("COHORT_ACCESS_DENIED", 403),
            Map.entry("COHORT_MANAGER_REQUIRED", 403),
            Map.entry("SYSTEM_ADMIN_REQUIRED", 403),
            Map.entry("COHORT_NOT_FOUND", 404),
            Map.entry("MEMBERSHIP_NOT_FOUND", 404),
            Map.entry("JOIN_CODE_NOT_FOUND", 404),
            Map.entry("COHORT_ALREADY_CLOSED", 409),
            Map.entry("COHORT_ACTIVE_MANAGER_REQUIRED", 409),
            Map.entry("MEMBERSHIP_DUPLICATED", 409),
            Map.entry("JOIN_CODE_EXPIRED", 409),
            Map.entry("JOIN_CODE_REVOKED", 409),
            Map.entry("JOIN_CODE_ALREADY_EXISTS", 409),
            Map.entry("ATTENDANCE_POLICY_NOT_FOUND", 404),
            Map.entry("ATTENDANCE_RECORD_NOT_FOUND", 404),
            Map.entry("ATTENDANCE_ALREADY_CHECKED_IN", 409),
            Map.entry("ATTENDANCE_ALREADY_CHECKED_OUT", 409),
            Map.entry("ATTENDANCE_CHECK_IN_REQUIRED", 409),
            Map.entry("ATTENDANCE_CHANGE_REASON_REQUIRED", 400),
            Map.entry("COMMUNITY_POST_NOT_FOUND", 404),
            Map.entry("COMMUNITY_INVALID_PAGE_REQUEST", 400),
            Map.entry("COMMUNITY_INVALID_POST_REQUEST", 400),
            Map.entry("COMMUNITY_POST_ACCESS_DENIED", 403),
            Map.entry("COMMUNITY_INVALID_ATTACHMENT", 400),
            Map.entry("REPRESENTATIVE_CHARACTER_NOT_FOUND", 404),
            Map.entry("GAME_CHARACTER_NOT_FOUND", 404),
            Map.entry("REPRESENTATIVE_CHARACTER_ALREADY_EXISTS", 409),
            Map.entry("INVALID_CHARACTER_NICKNAME", 400),
            Map.entry("DUPLICATE_NICKNAME", 409),
            Map.entry("INVALID_CHARACTER_COLOR", 400),
            Map.entry("LEVEL_POLICY_NOT_FOUND", 404),
            Map.entry("DAILY_QUEST_NOT_FOUND", 404),
            Map.entry("DAILY_QUEST_NOT_COMPLETED", 409),
            Map.entry("DAILY_QUEST_ALREADY_CLAIMED", 409),
            Map.entry("DAILY_QUEST_EXPIRED", 409),
            Map.entry("USER_PROFILE_INVALID_NICKNAME", 400),
            Map.entry("USER_PROFILE_DUPLICATE_NICKNAME", 409)
    );

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

        if (isPublicLearningDownstreamError(exception)) {
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

        logLearningDownstreamFailure(exception, request);
        if (exception.getStatusCode().is5xxServerError()) {
            return response(CommonErrorCode.INTERNAL_SERVER_ERROR, request);
        }

        return response(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, request);
    }

    private boolean isPublicLearningDownstreamError(
            LearningDownstreamException exception
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();
        Integer approvedStatus = PUBLIC_LEARNING_DOWNSTREAM_ERRORS.get(downstream.code());
        return approvedStatus != null
                && approvedStatus == exception.getStatusCode().value();
    }

    private void logLearningDownstreamFailure(
            LearningDownstreamException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();
        log.error(
                "Learning 하류 오류 은닉 downstream.status={}, downstream.code={}, "
                        + "downstream.requestId={}, exception={}, method={}, path={}",
                exception.getStatusCode().value(),
                downstream.code(),
                downstream.requestId(),
                exception.getClass().getName(),
                request.getMethod(),
                request.getRequestURI(),
                exception
        );
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
