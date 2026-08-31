package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class SpringSessionBrowserSessionTokenStoreTest {

    @Mock
    private SessionRepository<Session> sessionRepository;

    @Test
    @DisplayName("SessionRepository Redis 장애의 경계 예외 변환과 cause 보존")
    void wrapsRedisFailure() {
        // Given: 최신 Spring Session 조회 중 발생한 Redis 연결 장애
        RedisConnectionFailureException redisFailure =
                new RedisConnectionFailureException("connection refused");
        given(sessionRepository.findById("browser-session-id"))
                .willThrow(redisFailure);
        SpringSessionBrowserSessionTokenStore tokenStore =
                new SpringSessionBrowserSessionTokenStore(sessionRepository);

        // When: 최신 Token Bundle 조회
        // Then: Application이 실패 단계를 판단할 수 있는 예외와 원본 cause
        assertThatThrownBy(() -> tokenStore.find("browser-session-id"))
                .isInstanceOfSatisfying(
                        BrowserSessionStoreUnavailableException.class,
                        exception -> assertThat(exception.getCause()).isSameAs(redisFailure)
                );
    }

    @Test
    @DisplayName("예상하지 못한 SessionRepository 실패의 원본 전파")
    void propagatesUnexpectedFailure() {
        // Given: Redis 장애로 분류할 수 없는 예상 밖 실패
        IllegalStateException unexpected = new IllegalStateException("unexpected");
        given(sessionRepository.findById("browser-session-id"))
                .willThrow(unexpected);
        SpringSessionBrowserSessionTokenStore tokenStore =
                new SpringSessionBrowserSessionTokenStore(sessionRepository);

        // When: 최신 Token Bundle 조회
        // Then: 503으로 숨기지 않고 원본 예외 전파
        assertThatThrownBy(() -> tokenStore.find("browser-session-id"))
                .isSameAs(unexpected);
    }
}
