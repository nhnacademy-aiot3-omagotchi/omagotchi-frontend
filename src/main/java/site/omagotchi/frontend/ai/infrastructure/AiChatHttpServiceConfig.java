package site.omagotchi.frontend.ai.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.HttpServiceGroup.ClientType;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = AiChatHttpServiceConfig.GROUP_NAME,
        types = AiChatHttpService.class,
        clientType = ClientType.WEB_CLIENT
)
@SuppressWarnings("java:S1118") // Spring이 인스턴스화하는 설정 클래스이므로 private 생성자를 둘 수 없다.
public class AiChatHttpServiceConfig {

    static final String GROUP_NAME = "learning-ai-service";
}
