package site.omagotchi.frontend.account.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = AdminAccountGatewayHttpServiceConfig.GROUP_NAME,
        types = AdminAccountGatewayHttpService.class
)
@SuppressWarnings("java:S1118")
public class AdminAccountGatewayHttpServiceConfig {

    static final String GROUP_NAME = "gateway-service";
}
