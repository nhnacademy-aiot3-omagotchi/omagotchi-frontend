package site.omagotchi.frontend.auth.infrastructure;

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

// Identity 공통 오류 응답의 호출별 허용 Code·HTTP 상태 검증과 Frontend 예외 변환
@Component
@RequiredArgsConstructor
class IdentityAuthFailureTranslator {

    // Frontend가 Identity 호출에 사용하는 HTTP Basic 자격 증명 실패 Code
    private static final String FRONTEND_AUTHENTICATION_REQUIRED =
            "AUTH_AUTHENTICATION_REQUIRED";

    private final ApiErrorResponseDecoder errorDecoder;

    BusinessException translate(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ApiErrorResponse response = errorDecoder.decode(exception);
        HttpStatusCode actualStatus = exception.getStatusCode();

        // Frontend 호출 Credential 거절: Browser 사용자 인증 실패와 분리한 503 변환
        if (FRONTEND_AUTHENTICATION_REQUIRED.equals(response.code())) {
            if (actualStatus.value() == HttpStatus.UNAUTHORIZED.value()) {
                return new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE, exception);
            }
            return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

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
            return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        // HTTP 상태 불일치: 공개 Error Code 계약 위반의 502 변환
        HttpStatus expectedStatus = ErrorHttpMapper.toHttpStatus(matchedErrorCode.type());
        if (actualStatus.value() != expectedStatus.value()) {
            return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        // 공개 Error Code 일치: 동일한 Frontend BusinessException 변환
        return new BusinessException(matchedErrorCode, exception);
    }
}
