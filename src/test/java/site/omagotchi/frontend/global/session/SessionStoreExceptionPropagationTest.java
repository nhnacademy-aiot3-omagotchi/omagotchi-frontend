package site.omagotchi.frontend.global.session;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionStoreExceptionPropagationTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler(
            new BrowserSessionInvalidator()
    );

    @Test
    @DisplayName("REST Controller의 Redis Session 장애는 바깥 Filter까지 원본 예외 재전파")
    void rethrowsRedisSessionFailureFromApiExceptionHandler() {
        // Given: REST Controller 처리 중 발생한 Redis Session 연결 실패
        MockHttpServletRequest request =
                new MockHttpServletRequest("GET", "/test/errors/session");
        RedisConnectionFailureException exception =
                new RedisConnectionFailureException("redis connection failure");

        // When: 예상하지 못한 API 예외 처리 진입
        // Then: SessionStoreErrorFilter 대상 원본 예외 유지
        assertThatThrownBy(() -> handler.handleUnexpectedException(exception, request))
                .isSameAs(exception);
    }
}
