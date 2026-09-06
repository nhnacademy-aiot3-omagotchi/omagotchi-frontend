package site.omagotchi.frontend.global.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.ModelAndView;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.logging.HttpErrorEventLogger;

import static org.assertj.core.api.BDDAssertions.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class UnhandledExceptionLoggingResolverTest {

    private final HttpErrorEventLogger errorEventLogger = mock(HttpErrorEventLogger.class);
    private final UnhandledExceptionLoggingResolver resolver =
            new UnhandledExceptionLoggingResolver(errorEventLogger);

    @Test
    @DisplayName("미처리 예외 기록 뒤 응답 변경 없는 원본 처리 위임")
    void logsFailureWithoutResolvingResponse() throws Exception {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/page");
        MockHttpServletResponse response = new MockHttpServletResponse();
        IllegalStateException exception = new IllegalStateException("private-detail");

        // When
        ModelAndView result = resolver.resolveException(request, response, null, exception);

        // Then
        verify(errorEventLogger).log(exception, CommonErrorCode.INTERNAL_SERVER_ERROR, 500, request);
        then(result).isNull();
        then(response.getStatus()).isEqualTo(200);
        then(response.getContentAsString()).isEmpty();
        then(response.isCommitted()).isFalse();
    }

    @Test
    @DisplayName("Session 장애의 바깥 Filter 위임과 중복 오류 기록 제외")
    void leavesSessionFailureToOwningFilter() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/page");
        MockHttpServletResponse response = new MockHttpServletResponse();
        RedisConnectionFailureException exception = new RedisConnectionFailureException("unavailable");

        // When
        ModelAndView result = resolver.resolveException(request, response, null, exception);

        // Then
        then(result).isNull();
        verifyNoInteractions(errorEventLogger);
    }
}
