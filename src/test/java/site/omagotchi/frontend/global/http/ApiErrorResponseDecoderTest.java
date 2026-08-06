package site.omagotchi.frontend.global.http;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApiErrorResponseDecoderTest {

    private final ApiErrorResponseDecoder decoder = new ApiErrorResponseDecoder();

    @Test
    @DisplayName("오류 JSON 변환 실패 원인의 보존")
    void preservesJsonDecodeFailure() {
        // Given 오류 JSON 변환 실패와 민감한 응답 본문
        RestClientException decodeFailure = new RestClientException("JSON 변환 실패") {
        };
        RestClientResponseException responseException = new RestClientResponseException(
                "Identity 오류 응답",
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                new HttpHeaders(),
                "secret-response-body".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
        );
        responseException.setBodyConvertFunction(type -> {
            throw decodeFailure;
        });

        // When 오류 응답 해석
        ThrowingCallable action = () -> decoder.decode(responseException);

        // Then 원인 보존과 응답 본문 비노출
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode())
                            .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                    assertThat(exception.getCause()).isSameAs(decodeFailure);
                    assertThat(exception.getDiagnosticMessage())
                            .isEqualTo("HTTP 오류 응답 JSON 해석 실패 status=400");
                    assertThat(exception.getMessage()).doesNotContain("secret-response-body");
                });
    }

    @Test
    @DisplayName("필수 오류 본문 값 누락 거절")
    void rejectsMissingRequiredField() {
        // Given Code가 누락된 오류 응답
        ApiErrorResponse response = new ApiErrorResponse(
                "",
                "이미 사용 중인 이메일입니다.",
                "/api/v1/auth/signup",
                null
        );
        RestClientResponseException responseException = new RestClientResponseException(
                "Identity 오류 응답",
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                new HttpHeaders(),
                new byte[0],
                StandardCharsets.UTF_8
        );
        responseException.setBodyConvertFunction(type -> response);

        // When 오류 응답 해석
        ThrowingCallable action = () -> decoder.decode(responseException);

        // Then 호출 대상 응답 계약 위반 변환
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE)
                );
    }
}
