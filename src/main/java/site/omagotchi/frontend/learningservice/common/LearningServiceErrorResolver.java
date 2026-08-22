package site.omagotchi.frontend.learningservice.common;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

// Learning Service의 공통 오류 JSON을 Frontend 공개 오류로 제한해서 변환한다.
@Component
@RequiredArgsConstructor
public class LearningServiceErrorResolver {

    private final ApiErrorResponseDecoder errorDecoder;

    public ErrorCode resolve(
            RestClientResponseException exception,
            ErrorCode... acceptedFeatureErrors
    ) {
        ApiErrorResponse response = errorDecoder.decode(exception);
        HttpStatusCode actualStatus = exception.getStatusCode();

        ErrorCode matched = securityError(response.code());
        if (matched == null) {
            for (ErrorCode accepted : acceptedFeatureErrors) {
                if (accepted.code().equals(response.code())) {
                    matched = accepted;
                    break;
                }
            }
        }
        if (matched == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        HttpStatus expectedStatus = ErrorHttpMapper.toHttpStatus(matched.type());
        if (actualStatus.value() != expectedStatus.value()) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }
        return matched;
    }

    private static ErrorCode securityError(String code) {
        return switch (code) {
            case "AUTH_AUTHENTICATION_REQUIRED" -> SecurityErrorCode.AUTHENTICATION_REQUIRED;
            case "AUTH_ACCESS_DENIED" -> SecurityErrorCode.ACCESS_DENIED;
            default -> null;
        };
    }
}
