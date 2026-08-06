package site.omagotchi.frontend.auth.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;

import java.nio.charset.StandardCharsets;
import java.util.Objects;

import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

@SpringBootTest
@ActiveProfiles("test")
@Import(IdentityAuthHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class IdentityAuthHttpServiceConfigTest {

    @Autowired
    private IdentityAuthHttpService httpService;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @Test
    @DisplayName("실제 HTTP Service Group 설정의 Frontend Basic 인증")
    void appliesFrontendBasicCredential() {
        // Given: 실제 Group 설정에 연결된 Identity Mock 응답
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v1/auth/signup"))
                .andExpect(header(
                        HttpHeaders.AUTHORIZATION,
                        "Basic " + HttpHeaders.encodeBasicAuth(
                                "frontend",
                                "test-only-frontend-credential-value",
                                StandardCharsets.UTF_8
                        )
                ))
                .andRespond(withStatus(HttpStatus.CREATED));

        // When: 실제 HTTP Service Interface 호출
        httpService.signUp(
                new IdentitySignupRequest(
                        "user@example.com",
                        "password-passphrase",
                        "오마고치"
                )
        );

        // Then: Basic 인증 Header
        server.verify();
    }

    // 실제 HTTP Service Group Builder에 Mock Server 연결
    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private MockRestServiceServer server;

        @Bean
        RestClientHttpServiceGroupConfigurer identityMockServerConfigurer() {
            return groups -> groups
                    .filterByName(IdentityAuthHttpServiceConfig.GROUP_NAME)
                    .forEachClient((ignoredGroup, builder) ->
                            server = MockRestServiceServer.bindTo(builder).build()
                    );
        }

        MockRestServiceServer server() {
            return Objects.requireNonNull(server, "Identity Mock Server 미등록");
        }
    }
}
