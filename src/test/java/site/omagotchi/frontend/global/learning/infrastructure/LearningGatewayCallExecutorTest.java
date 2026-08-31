package site.omagotchi.frontend.global.learning.infrastructure;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.UnknownContentTypeException;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class LearningGatewayCallExecutorTest {

    private final ApiErrorResponseDecoder decoder = new ApiErrorResponseDecoder();
    private final LearningGatewayCallExecutor executor = new LearningGatewayCallExecutor(decoder);

    @Test
    @DisplayName("Learning 연결 실패의 503 변환")
    void mapsConnectionFailureToServiceUnavailable() {
        // Given: HTTP 응답 없는 Learning 연결 실패
        ResourceAccessException failure = new ResourceAccessException("connection failure");

        // When: Learning 하류 호출 실행
        ThrowingCallable action = () -> executor.execute(() -> {
            throw failure;
        });

        // Then: 서비스 일시 장애 변환과 원인 보존
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertSoftly(softly -> {
                        softly.assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE);
                        softly.assertThat(exception.getCause()).isSameAs(failure);
                    });
                });
    }

    @Test
    @DisplayName("Learning HTTP 오류 상태와 공통 오류 본문 보존")
    void preservesDownstreamHttpError() {
        // Given: 공통 오류 계약을 지킨 Learning 4xx 응답
        RestClientResponseException failure = responseFailure(HttpStatus.CONFLICT);
        ApiErrorResponse errorResponse = new ApiErrorResponse(
                "ATTENDANCE_ALREADY_CHECKED_IN",
                "이미 출석했습니다.",
                "/api/v1/cohorts/7/attendance-records/check-in",
                "request-123"
        );
        failure.setBodyConvertFunction(ignoredType -> errorResponse);

        // When: Learning 하류 호출 실행
        ThrowingCallable action = () -> executor.execute(() -> {
            throw failure;
        });

        // Then: 하류 상태, 공개 오류 본문과 원인 보존
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(LearningDownstreamException.class, exception -> {
                    assertSoftly(softly -> {
                        softly.assertThat(exception.getStatusCode())
                                .isEqualTo(HttpStatus.CONFLICT);
                        softly.assertThat(exception.getErrorResponse()).isSameAs(errorResponse);
                        softly.assertThat(exception.getCause()).isSameAs(failure);
                    });
                });
    }

    @Test
    @DisplayName("Learning 성공 응답 Content-Type 계약 위반의 502 변환")
    void mapsUnknownResponseContentTypeToBadGateway() {
        // Given: 2xx 응답이지만 선언한 응답 Body로 읽을 수 없는 Content-Type
        UnknownContentTypeException failure = new UnknownContentTypeException(
                String.class,
                MediaType.TEXT_HTML,
                HttpStatus.OK,
                "OK",
                new HttpHeaders(),
                "<html>unexpected</html>".getBytes(StandardCharsets.UTF_8)
        );

        // When: Learning 하류 호출 실행
        ThrowingCallable action = () -> executor.execute(() -> {
            throw failure;
        });

        // Then: 호출 대상 성공 응답 계약 위반의 502 변환
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertSoftly(softly -> {
                        softly.assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
                        softly.assertThat(exception.getCause()).isSameAs(failure);
                    });
                });
    }

    @Test
    @DisplayName("분류하지 않은 Learning RestClient 오류의 원본 전파")
    void rethrowsUnclassifiedRestClientException() {
        // Given: 응답 계약 위반으로 분류할 수 없는 RestClient 오류
        RestClientException failure = new RestClientException("unclassified failure");

        // When: Learning 하류 호출 실행
        ThrowingCallable action = () -> executor.execute(() -> {
            throw failure;
        });

        // Then: 원본 RestClient 오류 전파
        assertThatThrownBy(action).isSameAs(failure);
    }

    private static RestClientResponseException responseFailure(HttpStatus status) {
        return new RestClientResponseException(
                status.getReasonPhrase(),
                status,
                status.getReasonPhrase(),
                new HttpHeaders(),
                new byte[0],
                StandardCharsets.UTF_8
        );
    }
}
