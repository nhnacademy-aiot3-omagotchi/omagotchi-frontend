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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import org.springframework.web.context.WebApplicationContext;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.infrastructure.request.IdentitySignupRequest;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(IdentityAuthHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class IdentityAuthHttpServiceConfigTest {

    private static final String SIGNUP_DETAILS = """
            {
              "email": "user@example.com",
              "password": "password-passphrase",
              "name": "오마고치"
            }
            """;
    private static final String VERIFIED_SIGNUP = """
            {
              "email": "user@example.com",
              "password": "password-passphrase",
              "name": "오마고치",
              "challengeId": "challenge-id",
              "code": "123456"
            }
            """;
    private static final String PASSWORD_CHANGE = """
            {
              "currentPassword": "current-password-passphrase",
              "newPassword": "new-password-passphrase",
              "challengeId": "challenge-id",
              "code": "123456"
            }
            """;
    private static final String CHALLENGE_RESPONSE = """
            {
              "challengeId": "challenge-id",
              "expiresInSeconds": 600
            }
            """;

    @Autowired
    private IdentityAuthHttpService httpService;

    @Autowired
    private IdentitySignupV2HttpService signupV2HttpService;

    @Autowired
    private IdentityAccountHttpService accountHttpService;

    @Autowired
    private HttpComponentsClientHttpRequestFactory identityClientHttpRequestFactory;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private BrowserSessionTokens browserSessionTokens;

    private MockMvc mockMvc;

    @BeforeEach
    void resetMockServer() {
        mockHttpServiceConfiguration.server().reset();
        // 실제 Security Filter와 BFF Bean을 사용하고 Redis 저장소 대신 Mock HTTP Session을 사용한다.
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    @DisplayName("기존 v1 가입 HTTP Service의 Frontend Basic 인증 유지")
    void appliesFrontendBasicCredential() {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v1/auth/signup"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, frontendBasicCredential()))
                .andRespond(withStatus(HttpStatus.CREATED));

        httpService.signUp(new IdentitySignupRequest(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        ));

        server.verify();
    }

    @Test
    @DisplayName("v2 회원가입 OTP 요청에도 Frontend Basic 인증 적용")
    void appliesFrontendBasicCredentialToV2Signup() {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo(
                        "http://localhost:8083/api/v2/auth/signup/email-otp"
                ))
                .andExpect(header(
                        HttpHeaders.AUTHORIZATION,
                        "Basic " + HttpHeaders.encodeBasicAuth(
                                "frontend",
                                "test-only-frontend-credential-value",
                                StandardCharsets.UTF_8
                        )
                ))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "challengeId": "challenge-id",
                                  "expiresInSeconds": 600
                                }
                                """));

        signupV2HttpService.requestEmailOtp(new IdentitySignupRequest(
                "user@example.com",
                "password-passphrase",
                "오마고치"
        ));

        server.verify();
    }

    @Test
    @DisplayName("Bearer 요청은 HTTP Service Group의 기본 Basic 인증을 교체")
    void explicitBearerCredentialOverridesBasicDefault() {
        // Given: 로그인 사용자용 Identity API 응답
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo(
                        "http://localhost:8083/api/v2/users/me/password/email-otp"
                ))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "challengeId": "challenge-id",
                                  "expiresInSeconds": 600
                                }
                                """));

        // When: 명시적 Bearer 인증으로 보호 API 호출
        accountHttpService.requestEmailVerification("Bearer access-token");

        // Then: Basic과 중복되지 않은 단일 Bearer Header
        server.verify();
    }

    @Test
    @DisplayName("가입 BFF에서 실제 Service와 HTTP Client를 거쳐 Identity v2 계약 호출")
    void connectsSignupBffToIdentity() throws Exception {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v2/auth/signup/email-otp"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, frontendBasicCredential()))
                .andExpect(content().json(SIGNUP_DETAILS))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(CHALLENGE_RESPONSE));
        server.expect(once(), requestTo("http://localhost:8083/api/v2/auth/signup"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, frontendBasicCredential()))
                .andExpect(content().json(VERIFIED_SIGNUP))
                .andRespond(withStatus(HttpStatus.CREATED));

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_DETAILS))
                .andExpectAll(
                        status().isOk(),
                        MockMvcResultMatchers.header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.challengeId").value("challenge-id"),
                        jsonPath("$.expiresInSeconds").value(600)
                );
        mockMvc.perform(post("/bff/v2/auth/signup")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VERIFIED_SIGNUP))
                .andExpectAll(
                        status().isCreated(),
                        MockMvcResultMatchers.header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        MockMvcResultMatchers.content().string("")
                );

        server.verify();
    }

    @Test
    @DisplayName("Identity cooldown 응답이 실제 BFF 연결을 통해 Retry-After로 전달")
    void forwardsIdentityCooldownThroughBff() throws Exception {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v2/auth/signup/email-otp"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .header(HttpHeaders.RETRY_AFTER, "37")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                                  "message": "잠시 후 인증 코드를 다시 요청해 주세요.",
                                  "path": "/api/v2/auth/signup/email-otp"
                                }
                                """));

        mockMvc.perform(post("/bff/v2/auth/signup/email-otp")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGNUP_DETAILS))
                .andExpectAll(
                        status().isTooManyRequests(),
                        MockMvcResultMatchers.header().string(HttpHeaders.RETRY_AFTER, "37"),
                        jsonPath("$.code").value("EMAIL_VERIFICATION_COOLDOWN_ACTIVE")
                );

        server.verify();
    }

    @Test
    @DisplayName("Identity 429 응답을 HTTP Client에서 자동 재시도하지 않는다")
    void doesNotAutomaticallyRetryIdentityRateLimit() throws IOException {
        AtomicInteger requestCount = new AtomicInteger();
        HttpServer identityServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        identityServer.createContext("/email-otp", exchange -> {
            requestCount.incrementAndGet();
            byte[] responseBody = """
                    {
                      "code": "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
                      "message": "잠시 후 인증 코드를 다시 요청해 주세요."
                    }
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
            exchange.getResponseHeaders().add(HttpHeaders.RETRY_AFTER, "1");
            exchange.sendResponseHeaders(HttpStatus.TOO_MANY_REQUESTS.value(), responseBody.length);
            exchange.getResponseBody().write(responseBody);
            exchange.close();
        });
        identityServer.start();

        try {
            RestClient client = RestClient.builder()
                    .requestFactory(identityClientHttpRequestFactory)
                    .baseUrl("http://127.0.0.1:" + identityServer.getAddress().getPort())
                    .build();

            assertThatThrownBy(() -> client.post()
                    .uri("/email-otp")
                    .retrieve()
                    .toBodilessEntity()
            ).isInstanceOf(HttpClientErrorException.TooManyRequests.class);
            assertThat(requestCount).hasValue(1);
        } finally {
            identityServer.stop(0);
        }
    }

    @Test
    @DisplayName("비밀번호 BFF가 Session JWT를 전달하고 Identity 변경 성공 뒤 Session 종료")
    void connectsPasswordBffWithSessionBearerToken() throws Exception {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v2/users/me/password/email-otp"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer session-access-token"))
                .andRespond(withStatus(HttpStatus.ACCEPTED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(CHALLENGE_RESPONSE));
        server.expect(once(), requestTo("http://localhost:8083/api/v2/users/me/password"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer session-access-token"))
                .andExpect(content().json(PASSWORD_CHANGE))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));
        MockHttpSession session = browserSession();

        mockMvc.perform(post("/bff/v2/users/me/password/email-otp")
                        .session(session)
                        .with(user("user"))
                        .with(csrf())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer browser-supplied-token"))
                .andExpectAll(
                        status().isAccepted(),
                        jsonPath("$.challengeId").value("challenge-id")
                );
        mockMvc.perform(patch("/bff/v2/users/me/password")
                        .session(session)
                        .with(user("user"))
                        .with(csrf())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer browser-supplied-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PASSWORD_CHANGE))
                .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        server.verify();
    }

    @Test
    @DisplayName("Identity 비밀번호 변경 거절은 BFF 오류로 전달하고 기존 Session 유지")
    void retainsSessionWhenIdentityRejectsPasswordChange() throws Exception {
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo("http://localhost:8083/api/v2/users/me/password"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "EMAIL_VERIFICATION_INVALID_CHALLENGE",
                                  "message": "인증 코드가 올바르지 않거나 만료되었습니다.",
                                  "path": "/api/v2/users/me/password"
                                }
                                """));
        MockHttpSession session = browserSession();

        mockMvc.perform(patch("/bff/v2/users/me/password")
                        .session(session)
                        .with(user("user"))
                        .with(csrf())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer browser-supplied-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PASSWORD_CHANGE))
                .andExpectAll(
                        status().isBadRequest(),
                        jsonPath("$.code").value("EMAIL_VERIFICATION_INVALID_CHALLENGE")
                );

        assertThat(session.isInvalid()).isFalse();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(session);
        assertThat(browserSessionTokens.find(request)).isPresent();
        server.verify();
    }

    private MockHttpSession browserSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        browserSessionTokens.save(request, new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2026-09-01T00:00:00Z"),
                "session-refresh-token",
                Instant.parse("2026-09-08T00:00:00Z")
        ));
        return (MockHttpSession) request.getSession(false);
    }

    private static String frontendBasicCredential() {
        return "Basic " + HttpHeaders.encodeBasicAuth(
                "frontend",
                "test-only-frontend-credential-value",
                StandardCharsets.UTF_8
        );
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
