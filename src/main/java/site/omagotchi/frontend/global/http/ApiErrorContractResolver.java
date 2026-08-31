package site.omagotchi.frontend.global.http;

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

// 하류 API 오류의 공개 Code 허용 목록과 HTTP 상태 계약 검증
@Component
@RequiredArgsConstructor
public class ApiErrorContractResolver {

    private final ApiErrorResponseDecoder errorDecoder;

    public ErrorCode resolve(
            RestClientResponseException exception,
            ErrorCode... acceptedErrorCodes
    ) {
        ApiErrorResponse response = errorDecoder.decode(exception);
        HttpStatusCode actualStatus = exception.getStatusCode();

        ErrorCode matchedErrorCode = null;
        for (ErrorCode acceptedErrorCode : acceptedErrorCodes) {
            if (acceptedErrorCode.code().equals(response.code())) {
                matchedErrorCode = acceptedErrorCode;
                break;
            }
        }
        if (matchedErrorCode == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }

        HttpStatus expectedStatus = ErrorHttpMapper.toHttpStatus(matchedErrorCode.type());
        if (actualStatus.value() != expectedStatus.value()) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, exception);
        }
        return matchedErrorCode;
    }
}
