package site.omagotchi.frontend.global.http;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HttpResponseContractValidatorTest {

    @Test
    @DisplayName("예상한 성공 Status 허용")
    void acceptsExpectedSuccessStatus() {
        // Given: 합의된 200 성공 응답
        ResponseEntity<String> response = ResponseEntity.ok("body");

        // When & Then: 성공 응답 계약 검증 통과
        assertThatCode(() -> HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "테스트 조회"
        )).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("누락되거나 예상과 다른 성공 Status 거부")
    void rejectsMissingOrUnexpectedSuccessStatus() {
        // Given: 누락된 응답과 예상하지 않은 201 성공 응답
        ResponseEntity<Void> unexpected = ResponseEntity.status(HttpStatus.CREATED).build();

        // When & Then: 잘못된 하류 응답 오류로 거부
        assertInvalid(null);
        assertInvalid(unexpected);
    }

    private static void assertInvalid(ResponseEntity<?> response) {
        assertThatThrownBy(() -> HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "테스트 조회"
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
