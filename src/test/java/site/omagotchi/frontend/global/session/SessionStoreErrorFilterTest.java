package site.omagotchi.frontend.global.session;

import io.lettuce.core.RedisCommandTimeoutException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class SessionStoreErrorFilterTest {

    @Test
    @DisplayName("Redis 연결 실패의 503 응답 Writer 위임")
    void delegatesRedisConnectionFailureToResponseWriter() throws Exception {
        // Given: Redis 연결 실패와 Session 장애 응답 Writer
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: Spring Session 후속 처리의 Redis 연결 실패
        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new RedisConnectionFailureException("connection refused");
        });

        // Then: Session 장애 응답 Writer 위임
        verify(responseWriter).write(request, response);
    }

    @Test
    @DisplayName("원인 체인의 Redis 명령 Timeout에 대한 503 응답 Writer 위임")
    void delegatesRedisCommandTimeoutCauseToResponseWriter() throws Exception {
        // Given: Redis 명령 Timeout 원인과 Session 장애 응답 Writer
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: 원인 체인에 포함된 Redis 명령 Timeout
        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new IllegalStateException(
                    "wrapped session failure",
                    new QueryTimeoutException(
                            "command timed out",
                            new RedisCommandTimeoutException("Redis command timed out")
                    )
            );
        });

        // Then: Session 장애 응답 Writer 위임
        verify(responseWriter).write(request, response);
    }

    @Test
    @DisplayName("원인 없는 QueryTimeoutException의 원본 전파")
    void propagatesRawQueryTimeoutException() {
        // Given: Redis 원인 없는 QueryTimeoutException
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();
        QueryTimeoutException exception =
                new QueryTimeoutException("other data store timeout");

        // When: Session Store 장애 처리 Filter 실행
        // Then: 원본 예외 전파와 응답 Writer 미호출
        assertThatThrownBy(() -> filter.doFilter(
                request,
                response,
                (ignoredRequest, ignoredResponse) -> {
                    throw exception;
                }
        )).isSameAs(exception);
        verifyNoInteractions(responseWriter);
    }

    @Test
    @DisplayName("다른 저장소의 일반 Timeout 원인에 대한 원본 전파")
    void propagatesGenericTimeoutCause() {
        // Given: 일반 Timeout 원인을 포함한 다른 저장소 예외
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();
        QueryTimeoutException exception = new QueryTimeoutException(
                "other data store timeout",
                new TimeoutException("query timed out")
        );

        // When: Session Store 장애 처리 Filter 실행
        // Then: 원본 예외 전파와 응답 Writer 미호출
        assertThatThrownBy(() -> filter.doFilter(
                request,
                response,
                (ignoredRequest, ignoredResponse) -> {
                    throw exception;
                }
        )).isSameAs(exception);
        verifyNoInteractions(responseWriter);
    }

    @Test
    @DisplayName("다른 DataAccess 오류의 원본 전파")
    void propagatesOtherDataAccessFailure() {
        // Given: Redis와 무관한 DataAccess 오류
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();
        DataAccessResourceFailureException exception =
                new DataAccessResourceFailureException("other data store");

        // When: Session Store 장애 처리 Filter 실행
        // Then: 원본 예외 전파와 응답 Writer 미호출
        assertThatThrownBy(() -> filter.doFilter(
                request,
                response,
                (ignoredRequest, ignoredResponse) -> {
                    throw exception;
                }
        )).isSameAs(exception);
        verifyNoInteractions(responseWriter);
    }

    @Test
    @DisplayName("커밋된 응답에서 발생한 Redis 장애의 원본 전파")
    void propagatesRedisFailureAfterResponseCommit() throws Exception {
        // Given: 이미 커밋된 응답과 Redis 연결 실패
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.getWriter().write("committed");
        response.flushBuffer();
        RedisConnectionFailureException exception =
                new RedisConnectionFailureException("connection refused");

        // When: 커밋 뒤 Redis 연결 실패
        // Then: 작성된 응답을 유지한 원본 예외 전파
        assertThatThrownBy(() -> filter.doFilter(
                request,
                response,
                (ignoredRequest, ignoredResponse) -> {
                    throw exception;
                }
        )).isSameAs(exception);
        assertThat(response.getContentAsString()).isEqualTo("committed");
        verifyNoInteractions(responseWriter);
    }

    @Test
    @DisplayName("중첩 ERROR dispatch의 Redis 장애에 대한 503 응답 Writer 위임")
    void delegatesNestedErrorDispatchFailureToResponseWriter() throws Exception {
        // Given: Spring Session과 같은 중첩 ERROR dispatch 상태
        SessionStoreFailureResponseWriter responseWriter =
                mock(SessionStoreFailureResponseWriter.class);
        SessionStoreErrorFilter filter = new SessionStoreErrorFilter(responseWriter);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/home");
        request.setDispatcherType(jakarta.servlet.DispatcherType.ERROR);
        request.setAttribute(
                SessionStoreErrorFilter.class.getName() + ".FILTERED",
                Boolean.TRUE
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When: 중첩 ERROR dispatch의 Redis 연결 실패
        filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
            throw new RedisConnectionFailureException("connection refused");
        });

        // Then: Session 장애 응답 Writer 위임
        verify(responseWriter).write(request, response);
    }
}
