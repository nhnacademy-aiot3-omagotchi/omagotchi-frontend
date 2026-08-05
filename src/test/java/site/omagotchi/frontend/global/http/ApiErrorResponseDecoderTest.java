package site.omagotchi.frontend.global.http;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
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

        // When & Then 원인 보존과 응답 본문 비노출
        assertThatThrownBy(() -> decoder.decode(responseException))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getErrorCode())
                            .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                    assertThat(exception.getCause()).isSameAs(decodeFailure);
                    assertThat(exception.getDiagnosticMessage())
                            .isEqualTo("HTTP 오류 응답 JSON 해석 실패 status=400");
                    assertThat(exception.getMessage()).doesNotContain("secret-response-body");
                });
    }
}
