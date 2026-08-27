package site.omagotchi.frontend.account.infrastructure;

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

import java.util.Objects;

import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

@SpringBootTest
@ActiveProfiles("test")
@Import(IdentityAccountHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class IdentityAccountHttpServiceConfigTest {

    @Autowired
    private IdentityAccountHttpService httpService;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @Test
    @DisplayName("계정 HTTP 클라이언트 등록과 사용자 Bearer 요청")
    void registersAccountHttpClientWithBearerAuthentication() {
        // Given: 계정 전용 HTTP 클라이언트 설정에 연결된 Mock Server
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v1/users/me"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer user-access-token"))
                .andRespond(withStatus(HttpStatus.OK)
                        .header(HttpHeaders.CONTENT_TYPE, "application/json")
                        .body("{\"email\":\"user@example.com\",\"name\":\"오마고치\"}"));

        // When: 사용자 Bearer 인증을 포함한 계정 조회
        httpService.getCurrentAccount("Bearer user-access-token");

        // Then: 테스트 Base URL과 사용자 Bearer Header가 적용된 요청
        server.verify();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private MockRestServiceServer server;

        @Bean
        RestClientHttpServiceGroupConfigurer identityAccountMockServerConfigurer() {
            return groups -> groups
                    .filterByName(IdentityAccountHttpServiceConfig.GROUP_NAME)
                    .forEachClient((ignoredGroup, builder) ->
                            server = MockRestServiceServer.bindTo(builder).build()
                    );
        }

        MockRestServiceServer server() {
            return Objects.requireNonNull(server, "Identity Account Mock Server 미등록");
        }
    }
}
