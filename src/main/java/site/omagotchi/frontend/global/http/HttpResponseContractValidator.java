package site.omagotchi.frontend.global.http;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

public final class HttpResponseContractValidator {

    private HttpResponseContractValidator() {
    }

    public static void requireStatus(
            ResponseEntity<?> response,
            HttpStatusCode expectedStatus,
            String operation
    ) {
        if (response == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 누락"
            );
        }
        if (response.getStatusCode().value() != expectedStatus.value()) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 Status 불일치 expected="
                            + expectedStatus.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }

    public static <T> T requireBody(
            ResponseEntity<T> response,
            String operation
    ) {
        if (response == null || response.getBody() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 Body 누락"
            );
        }
        return response.getBody();
    }
}
