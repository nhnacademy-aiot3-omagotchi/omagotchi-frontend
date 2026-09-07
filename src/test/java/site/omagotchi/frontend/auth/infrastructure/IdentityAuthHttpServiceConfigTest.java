package site.omagotchi.frontend.auth.infrastructure;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityRefreshTokenRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetEmailChallengeRequest;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

@SpringBootTest
@ActiveProfiles("test")
@Import(IdentityAuthHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class IdentityAuthHttpServiceConfigTest {

    @Autowired
    private IdentityAuthHttpService httpService;

    @Autowired
    private IdentityPasswordResetHttpService passwordResetHttpService;

    @Autowired
    private HttpComponentsClientHttpRequestFactory identityClientHttpRequestFactory;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @BeforeEach
    void resetMockServer() {
        mockHttpServiceConfiguration.server().reset();
    }

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

    @Test
    @DisplayName("Refresh HTTP Service의 Frontend Basic 인증과 요청 JSON")
    void appliesFrontendBasicCredentialToRefresh() {
        // Given: 실제 Group 설정에 연결된 Identity Refresh 응답
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v1/auth/refresh"))
                .andExpect(header(
                        HttpHeaders.AUTHORIZATION,
                        "Basic " + HttpHeaders.encodeBasicAuth(
                                "frontend",
                                "test-only-frontend-credential-value",
                                StandardCharsets.UTF_8
                        )
                ))
                .andExpect(content().json("""
                        {
                          "refreshToken": "refresh-token"
                        }
                        """))
                .andRespond(withStatus(HttpStatus.OK)
                        .header(HttpHeaders.CONTENT_TYPE, "application/json")
                        .body("""
                                {
                                  "userId": "00000000-0000-0000-0000-000000000001",
                                  "globalRole": "USER",
                                  "accessToken": "access-token",
                                  "accessTokenExpiresAt": "2099-08-03T12:00:00Z",
                                  "refreshToken": "rotated-refresh-token",
                                  "refreshTokenExpiresAt": "2099-08-10T12:00:00Z"
                                }
                                """));

        // When: 실제 HTTP Service Interface의 Refresh 호출
        httpService.refresh(new IdentityRefreshTokenRequest("refresh-token"));

        // Then: Basic 인증 Header와 Refresh 요청 Body
        server.verify();
    }

    @Test
    @DisplayName("비밀번호 재설정 HTTP Service에도 Frontend Basic 인증 적용")
    void appliesFrontendBasicCredentialToPasswordReset() {
        // Given: 실제 Group 설정에 연결된 Identity 비밀번호 재설정 Mock 응답
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo(
                        "http://localhost:8083/api/v2/auth/password-reset/email-otp"
                ))
                .andExpect(header(
                        HttpHeaders.AUTHORIZATION,
                        "Basic " + HttpHeaders.encodeBasicAuth(
                                "frontend",
                                "test-only-frontend-credential-value",
                                StandardCharsets.UTF_8
                        )
                ))
                .andExpect(content().json("{\"email\":\"user@example.com\"}"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .header(HttpHeaders.CONTENT_TYPE, "application/json")
                        .body("""
                                {
                                  "challengeId": "00000000-0000-0000-0000-000000900001",
                                  "expiresInSeconds": 300
                                }
                                """));

        // When: 실제 비밀번호 재설정 HTTP Service Interface 호출
        passwordResetHttpService.requestEmailOtp(
                new IdentityPasswordResetEmailChallengeRequest("user@example.com")
        );

        // Then: 공유 Frontend Basic 인증 Header
        server.verify();
    }

    @Test
    @DisplayName("Identity 429 Retry-After 응답을 자동 재시도하지 않음")
    void disablesAutomaticRetryForRateLimitResponse() throws IOException {
        AtomicInteger requestCount = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/rate-limit", exchange -> {
            requestCount.incrementAndGet();
            exchange.getResponseHeaders().add(HttpHeaders.RETRY_AFTER, "0");
            exchange.sendResponseHeaders(HttpStatus.TOO_MANY_REQUESTS.value(), -1);
            exchange.close();
        });
        server.start();

        try {
            RestClient restClient = RestClient.builder()
                    .requestFactory(identityClientHttpRequestFactory)
                    .build();

            assertThatThrownBy(() -> restClient.get()
                    .uri("http://127.0.0.1:" + server.getAddress().getPort() + "/rate-limit")
                    .retrieve()
                    .toBodilessEntity())
                    .isInstanceOf(HttpClientErrorException.TooManyRequests.class);

            assertThat(requestCount).hasValue(1);
        } finally {
            server.stop(0);
        }
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
