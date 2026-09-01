package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.EmailVerificationCooldownException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.Arrays;

// Identity 인증 호출의 Frontend 자격 증명 실패 변환과 공통 오류 계약 위임
@Component
@RequiredArgsConstructor
class IdentityAuthErrorResolver {

    private final ApiErrorContractResolver errorContractResolver;

    ErrorCode resolve(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ErrorCode[] identityErrorCodes = Arrays.copyOf(
                acceptedErrorCodes,
                acceptedErrorCodes.length + 1
        );
        identityErrorCodes[acceptedErrorCodes.length] =
                SecurityErrorCode.AUTHENTICATION_REQUIRED;

        ErrorCode resolvedErrorCode = errorContractResolver.resolve(
                exception,
                identityErrorCodes
        );
        if (resolvedErrorCode == SecurityErrorCode.AUTHENTICATION_REQUIRED) {
            // Frontend 호출 자격 증명 거절과 Browser 사용자 인증 실패의 분리
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
        }
        return resolvedErrorCode;
    }

    BusinessException resolveFailure(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ErrorCode errorCode = resolve(exception, acceptedErrorCodes);
        if (errorCode == AuthErrorCode.EMAIL_VERIFICATION_COOLDOWN_ACTIVE) {
            return new EmailVerificationCooldownException(
                    retryAfterSeconds(exception),
                    exception
            );
        }
        return new BusinessException(errorCode, exception);
    }

    private long retryAfterSeconds(RestClientResponseException exception) {
        HttpHeaders headers = exception.getResponseHeaders();
        String value = headers == null
                ? null
                : headers.getFirst(HttpHeaders.RETRY_AFTER);
        if (value == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    exception
            );
        }
        try {
            long seconds = Long.parseLong(value);
            if (seconds < 1) {
                throw new NumberFormatException("non-positive Retry-After");
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
}
