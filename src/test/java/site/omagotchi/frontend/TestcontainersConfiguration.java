package site.omagotchi.frontend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * 로컬 실행용 컨테이너 구성.
 *
 * <p>View는 Spring Session 저장소로 Redis만 필요하다. 업무 데이터는 전부 Learning이
 * 소유하므로 이 서비스에는 DB가 없다.
 *
 * <p>{@code @ServiceConnection}이 컨테이너의 실제 host·port를 Redis 연결에 주입하므로
 * {@code .env.local}의 SESSION_REDIS_HOST·PORT 값은 무시된다. 다만 설정 Placeholder
 * 해석에는 여전히 값이 필요하므로 {@code .env.local} 자체는 있어야 한다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    private static final int REDIS_PORT = 6379;

    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redisContainer() {
        return new GenericContainer<>(DockerImageName.parse("redis:7.4-alpine"))
                .withExposedPorts(REDIS_PORT);
    }
}
