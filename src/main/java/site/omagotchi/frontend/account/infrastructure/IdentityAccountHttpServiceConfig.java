package site.omagotchi.frontend.account.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = IdentityAccountHttpServiceConfig.GROUP_NAME,
        types = IdentityAccountHttpService.class
)
class IdentityAccountHttpServiceConfig {

    static final String GROUP_NAME = "identity-account-service";
}
