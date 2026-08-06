package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

@SpringBootTest(properties =
        "spring.http.serviceclient.identity-service.base-url=lb://unavailable-identity-service"
)
@ActiveProfiles("test")
class IdentityServiceDiscoveryFailureTest {

    @Autowired
    private IdentityAuthClient identityAuthClient;

    @Test
    @DisplayName("호출 가능한 Identity 인스턴스 부재의 503 변환")
    void reportsMissingIdentityInstanceAsServiceUnavailable() {
        // Given: 호출 가능한 Identity 인스턴스 부재
        // When: Identity 로그인 요청
        // Then: 서비스 일시 장애 변환
        assertThatThrownBy(() -> identityAuthClient.login(
                "user@example.com",
                "password-passphrase"
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertSoftly(softly -> {
                    softly.assertThat(exception.getErrorCode())
                            .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE);
                    softly.assertThat(exception.getCause())
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessageStartingWith("No instances available for ");
                })
        );
    }
}
