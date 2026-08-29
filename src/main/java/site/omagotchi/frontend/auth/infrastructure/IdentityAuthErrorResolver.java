package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;

// Identity 인증 4xx의 공개 Code·HTTP 상태 검증과 계약 위반 변환
@Component
@RequiredArgsConstructor
class IdentityAuthErrorResolver {

    // Frontend가 Identity 호출에 사용하는 HTTP Basic 자격 증명 실패 Code
    private static final String FRONTEND_AUTHENTICATION_REQUIRED =
            "AUTH_AUTHENTICATION_REQUIRED";

    private final ApiErrorResponseDecoder errorDecoder;

    ErrorCode resolve(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ApiErrorResponse response = errorDecoder.decode(exception);
        HttpStatusCode actualStatus = exception.getStatusCode();

        // Frontend 호출 Credential 거절: Browser 사용자 인증 실패와 분리한 503 변환
        if (FRONTEND_AUTHENTICATION_REQUIRED.equals(response.code())) {
            if (actualStatus.value() == HttpStatus.UNAUTHORIZED.value()) {
                throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
            }
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        return resolveAccepted(exception, response, actualStatus, acceptedErrorCodes);
    }

    ErrorCode resolveBearer(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ApiErrorResponse response = errorDecoder.decode(exception);
        return resolveAccepted(
                exception,
                response,
                exception.getStatusCode(),
                acceptedErrorCodes
        );
    }

    BusinessException resolveFailure(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        return toBusinessException(
                exception,
                resolve(exception, acceptedErrorCodes)
        );
    }

    BusinessException resolveBearerFailure(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        return toBusinessException(
                exception,
                resolveBearer(exception, acceptedErrorCodes)
        );
    }

    long retryAfterSeconds(RestClientResponseException exception) {
        HttpHeaders headers = exception.getResponseHeaders();
        String value = headers == null ? null : headers.getFirst(HttpHeaders.RETRY_AFTER);
        if (value == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }
        try {
            long seconds = Long.parseLong(value);
            if (seconds < 0) {
                throw new NumberFormatException("negative Retry-After");
            }
            return seconds;
        } catch (NumberFormatException invalidHeader) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Identity Retry-After Header 형식 오류",
                    exception
            );
        }
    }

    private BusinessException toBusinessException(
            RestClientResponseException exception,
            ErrorCode errorCode
    ) {
        if (errorCode == AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE) {
            return new EmailVerificationCooldownException(
                    retryAfterSeconds(exception),
                    exception
            );
        }
        return new BusinessException(errorCode, exception);
    }

    private ErrorCode resolveAccepted(
            RestClientResponseException exception,
            ApiErrorResponse response,
            HttpStatusCode actualStatus,
            ErrorCode... acceptedErrorCodes
    ) {
        // 호출별 공개 Error Code 확인
        ErrorCode matchedErrorCode = null;
        for (ErrorCode acceptedErrorCode : acceptedErrorCodes) {
            if (acceptedErrorCode.code().equals(response.code())) {
                matchedErrorCode = acceptedErrorCode;
                break;
            }
        }

        // 미등록 Error Code: Identity 내부 오류 비공개와 502 변환
        if (matchedErrorCode == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        // HTTP 상태 불일치: 공개 Error Code 계약 위반의 502 변환
        HttpStatus expectedStatus = ErrorHttpMapper.toHttpStatus(matchedErrorCode.type());
        if (actualStatus.value() != expectedStatus.value()) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        return matchedErrorCode;
    }
}
