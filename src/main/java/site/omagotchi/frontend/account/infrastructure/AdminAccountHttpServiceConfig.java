package site.omagotchi.frontend.account.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = AdminAccountHttpServiceConfig.IDENTITY_GROUP_NAME,
        types = IdentityAdminAccountHttpService.class
)
@ImportHttpServices(
        group = AdminAccountHttpServiceConfig.LEARNING_GROUP_NAME,
        types = LearningCohortManagerHttpService.class
)
class AdminAccountHttpServiceConfig {

    static final String IDENTITY_GROUP_NAME = "identity-account-service";
    static final String LEARNING_GROUP_NAME = "learning-service";
}
