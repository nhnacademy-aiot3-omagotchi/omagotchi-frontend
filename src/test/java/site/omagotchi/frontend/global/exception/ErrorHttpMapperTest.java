package site.omagotchi.frontend.global.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorHttpMapperTest {

    @Test
    @DisplayName("Rate Limit 오류를 429 상태로 변환")
    void mapsRateLimitErrorType() {
        assertThat(ErrorHttpMapper.toHttpStatus(ErrorType.RATE_LIMIT))
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    @DisplayName("지원하는 Spring MVC 상태를 공통 오류로 변환")
    void mapsSupportedFrameworkStatusToCommonErrorCode() {
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.BAD_REQUEST))
                .contains(CommonErrorCode.INVALID_REQUEST);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.NOT_FOUND))
                .contains(CommonErrorCode.NOT_FOUND);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.METHOD_NOT_ALLOWED))
                .contains(CommonErrorCode.METHOD_NOT_ALLOWED);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.NOT_ACCEPTABLE))
                .contains(CommonErrorCode.NOT_ACCEPTABLE);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.UNSUPPORTED_MEDIA_TYPE))
                .contains(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.INTERNAL_SERVER_ERROR))
                .contains(CommonErrorCode.INTERNAL_SERVER_ERROR);
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.SERVICE_UNAVAILABLE))
                .contains(CommonErrorCode.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("정의하지 않은 Spring MVC 상태는 빈 계약")
    void returnsEmptyForUnsupportedFrameworkStatus() {
        assertThat(ErrorHttpMapper.findErrorCode(HttpStatus.UNPROCESSABLE_CONTENT))
                .isEmpty();
    }
}
