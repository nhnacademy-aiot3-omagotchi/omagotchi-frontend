package site.omagotchi.frontend.learning.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = LearningHttpServiceConfig.GROUP_NAME,
        types = LearningHttpService.class
)
@SuppressWarnings("java:S1118") // Spring이 인스턴스화하는 설정 클래스이므로 private 생성자를 둘 수 없다.
public class LearningHttpServiceConfig {

    static final String GROUP_NAME = "gateway-service";
}
