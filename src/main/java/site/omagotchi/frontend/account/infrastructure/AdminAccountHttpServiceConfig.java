package site.omagotchi.frontend.account.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = AdminAccountHttpServiceConfig.IDENTITY_GROUP_NAME,
        types = {
                IdentityAdminAccountHttpService.class,
                IdentityAdminAccountStatusHttpService.class,
                IdentityAdminAccountRoleHttpService.class,
                IdentityAdminAuditHttpService.class
        }
)
@ImportHttpServices(
        group = AdminAccountHttpServiceConfig.LEARNING_GROUP_NAME,
        types = LearningCohortManagerHttpService.class
)
@SuppressWarnings("java:S1118") // Spring이 인스턴스화하는 설정 클래스이므로 private 생성자를 둘 수 없다.
class AdminAccountHttpServiceConfig {

    static final String IDENTITY_GROUP_NAME = "identity-account-service";
    static final String LEARNING_GROUP_NAME = "learning-service";
}
