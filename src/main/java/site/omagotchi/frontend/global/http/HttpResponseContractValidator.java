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

    /**
     * Body 안쪽 필수 필드를 매핑 전에 검증한다.
     *
     * <p>{@link #requireBody}는 Body 자체만 본다. 중첩 필드가 {@code null}인 응답을 그대로
     * 매핑하면 {@code NullPointerException}이 나는데, 이는 호출 예외 변환 범위 밖이라
     * 계약 위반이 502가 아니라 500으로 새어 나간다.</p>
     */
    public static <T> T requireField(
            T value,
            String operation,
            String fieldName
    ) {
        if (value == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 필드 누락 field=" + fieldName
            );
        }
        return value;
    }
}
