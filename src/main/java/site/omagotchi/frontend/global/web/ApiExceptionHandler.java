package site.omagotchi.frontend.global.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
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
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;

import java.util.Map;
import java.util.Optional;

// @RestController 예외의 Frontend 공통 JSON 오류 응답 변환
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE) // HTML 예외 처리기보다 REST JSON 예외 처리 우선
@RestControllerAdvice(annotations = RestController.class)
@NullMarked
@RequiredArgsConstructor
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Map<String, Integer> PUBLIC_LEARNING_DOWNSTREAM_ERRORS = Map.ofEntries(
            Map.entry("COMMON_INVALID_REQUEST", 400),
            Map.entry("COMMON_MALFORMED_REQUEST", 400),
            Map.entry("AUTH_AUTHENTICATION_REQUIRED", 401),
            Map.entry("AUTH_ACCESS_DENIED", 403),
            Map.entry("ACCOUNT_ADMIN_ACCESS_NOT_ALLOWED", 403),
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
            Map.entry("COHORT_MANAGER_PERIOD_CONFLICT", 409),
            Map.entry("COHORT_DELETE_NOT_ALLOWED", 409),
            Map.entry("COHORT_DELETE_CONFLICT", 409),
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
            Map.entry("SPACE_INVALID_NAME", 400),
            Map.entry("SPACE_INVALID_CAPACITY", 400),
            Map.entry("SPACE_INVALID_TYPE", 400),
            Map.entry("SPACE_INVALID_COHORT_ID", 400),
            Map.entry("SPACE_COHORT_ID_REQUIRED", 400),
            Map.entry("SPACE_LAB_ONLY_COHORT_ASSIGNMENT", 400),
            Map.entry("SPACE_INVALID_INACTIVE_REASON", 400),
            Map.entry("SPACE_ACCESS_DENIED", 403),
            Map.entry("SPACE_UNMANAGED_DELETE_NOT_ALLOWED", 403),
            Map.entry("SPACE_NOT_FOUND", 404),
            Map.entry("ACTIVE_COHORT_NOT_FOUND", 404),
            Map.entry("SPACE_DUPLICATE_NAME", 409),
            Map.entry("SPACE_ALREADY_ACTIVE", 409),
            Map.entry("SPACE_ALREADY_INACTIVE", 409),
            Map.entry("SPACE_ACTIVE_OCCUPANCY_EXISTS", 409),
            Map.entry("SPACE_ACTIVE_CAPACITY_REDUCTION_NOT_ALLOWED", 409),
            Map.entry("SPACE_ACTIVE_TYPE_CHANGE_NOT_ALLOWED", 409),
            Map.entry("SPACE_ACTIVE_DELETE_NOT_ALLOWED", 409),
            Map.entry("SPACE_LAB_ALREADY_ASSIGNED", 409),
            Map.entry("SPACE_LAB_NOT_ASSIGNED", 409),
            Map.entry("OCCUPANCY_NOT_MEETING_ROOM", 400),
            Map.entry("OCCUPANCY_SPACE_INACTIVE", 400),
            Map.entry("OCCUPANCY_DIFFERENT_COHORT", 400),
            Map.entry("OCCUPANCY_OCCUPIER_CANNOT_LEAVE", 400),
            Map.entry("OCCUPANCY_ALERT_ROOM_AVAILABLE", 400),
            Map.entry("OCCUPANCY_ALERT_OCCUPIER_CANNOT_REQUEST", 400),
            Map.entry("OCCUPANCY_ALERT_COHORT_ID_REQUIRED", 400),
            Map.entry("OCCUPANCY_NOT_PRESENT", 403),
            Map.entry("OCCUPANCY_TARGET_NOT_PRESENT", 403),
            Map.entry("OCCUPANCY_NOT_OCCUPIER", 403),
            Map.entry("OCCUPANCY_ALERT_COHORT_ACCESS_DENIED", 403),
            Map.entry("OCCUPANCY_NOT_COHORT_MANAGER", 403),
            Map.entry("OCCUPANCY_SPACE_NOT_FOUND", 404),
            Map.entry("OCCUPANCY_PARTICIPANT_NOT_FOUND", 404),
            Map.entry("OCCUPANCY_ALERT_NOT_FOUND", 404),
            Map.entry("OCCUPANCY_ROOM_ALREADY_OCCUPIED", 409),
            Map.entry("OCCUPANCY_ALREADY_OCCUPYING", 409),
            Map.entry("OCCUPANCY_ALREADY_PARTICIPATING", 409),
            Map.entry("OCCUPANCY_ENDED", 409),
            Map.entry("OCCUPANCY_CAPACITY_EXCEEDED", 409),
            Map.entry("OCCUPANCY_OCCUPIER_MEMBERSHIP_INACTIVE", 409),
            Map.entry("OCCUPANCY_EXTENSION_TOO_EARLY", 409),
            Map.entry("OCCUPANCY_EXTENSION_LIMIT_EXCEEDED", 409),
            Map.entry("OCCUPANCY_ALERT_ALREADY_REQUESTED", 409),
            Map.entry("USER_PROFILE_INVALID_NICKNAME", 400),
            Map.entry("USER_PROFILE_DUPLICATE_NICKNAME", 409),
            Map.entry("TELEGRAM_USER_LINK_NOT_FOUND", 404)
    );

    private final BrowserSessionInvalidator sessionInvalidator;

    // 클라이언트 공개 ErrorCode와 응답 방식이 확정된 실패 처리
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessException(
            BusinessException exception,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        HttpStatus status = ErrorHttpMapper.toHttpStatus(exception.getErrorCode().type());
        if (status == HttpStatus.UNAUTHORIZED) {
            expireAuthenticationSession(request, response);
        } else if (status.is5xxServerError()) {
            logServerFailure(exception, exception.getErrorCode(), request);
        }
        return response(exception.getErrorCode(), request);
    }

    @ExceptionHandler(LearningDownstreamException.class)
    public ResponseEntity<ApiErrorResponse> handleLearningDownstreamException(
            LearningDownstreamException exception,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();

        if (exception.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
            expireAuthenticationSession(request, response);
        }

        if (isPublicLearningDownstreamError(exception)) {
            ApiErrorResponse publicResponse = new ApiErrorResponse(
                    downstream.code(),
                    publicLearningDownstreamMessage(exception.getStatusCode().value()),
                    request.getRequestURI(),
                    downstream.requestId()
            );
            return ResponseEntity.status(exception.getStatusCode())
                    .cacheControl(CacheControl.noStore())
                    .body(publicResponse);
        }

        logLearningDownstreamFailure(exception, request);
        if (exception.getStatusCode().is5xxServerError()) {
            return response(CommonErrorCode.INTERNAL_SERVER_ERROR, request);
        }

        return response(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, request);
    }

    private void expireAuthenticationSession(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (!BffApiPaths.matches(request)) {
            return;
        }
        sessionInvalidator.invalidateBestEffort(request, response);
    }

    private boolean isPublicLearningDownstreamError(
            LearningDownstreamException exception
    ) {
        ApiErrorResponse downstream = exception.getErrorResponse();
        Integer approvedStatus = PUBLIC_LEARNING_DOWNSTREAM_ERRORS.get(downstream.code());
        return approvedStatus != null
                && approvedStatus == exception.getStatusCode().value();
    }

    private String publicLearningDownstreamMessage(int status) {
        return switch (status) {
            case 400 -> "요청값이 올바르지 않습니다.";
            case 401 -> "인증이 필요합니다.";
            case 403 -> "접근 권한이 없습니다.";
            case 404 -> "요청한 정보를 찾을 수 없습니다.";
            case 409 -> "현재 상태에서는 요청을 처리할 수 없습니다.";
            default -> "요청을 처리할 수 없습니다.";
        };
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
