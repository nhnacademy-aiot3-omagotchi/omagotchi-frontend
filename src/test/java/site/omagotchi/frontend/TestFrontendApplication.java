package site.omagotchi.frontend;

import org.springframework.boot.SpringApplication;

/**
 * 로컬 검증용 진입점.
 *
 * <p>Redis를 직접 설치하지 않고 Testcontainers가 띄운 컨테이너로 기동한다.
 *
 * <p>최초 1회 설정:
 * {@code cp .env.local.example .env.local}
 *
 * <p>실행:
 * {@code ./mvnw spring-boot:test-run -Dspring-boot.run.profiles=local}
 */
public class TestFrontendApplication {

    public static void main(String[] args) {
        SpringApplication.from(FrontendApplication::main)
                .with(TestcontainersConfiguration.class)
                .run(args);
    }
}
