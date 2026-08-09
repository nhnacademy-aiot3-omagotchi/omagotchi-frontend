package site.omagotchi.frontend.global.session;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.data.redis.host=127.0.0.1",
                "spring.data.redis.port=1",
                "spring.data.redis.ssl.enabled=false",
                "spring.data.redis.connect-timeout=100ms",
                "spring.data.redis.timeout=100ms"
        }
)
@ActiveProfiles("test")
class SessionStoreFailureIntegrationTest {

    // Redis Session 조회를 강제하는 존재하지 않는 Session ID Cookie
    private static final String MISSING_SESSION_COOKIE =
            "OMAGOTCHI_SESSION=bWlzc2luZy1zZXNzaW9u";

    // 실제 Embedded Servlet Filter 순서와 Header 결과 확인용 HTTP Client
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @LocalServerPort
    private int serverPort;

    @Test
    @DisplayName("Redis 미접속 상태의 Login CSRF Session 저장 실패는 HTML 503")
    void returnsServiceUnavailableWhenNewSessionCannotBeSaved() throws Exception {
        // Given: Redis 미접속 Frontend
        // When: Login Page 요청과 익명 CSRF Session 저장 시도
        HttpResponse<String> response = sendPageRequest("/login", null);

        // Then: 보안 Header를 포함한 HTML 503 응답
        assertHtmlServiceUnavailable(response);
    }

    @Test
    @DisplayName("Redis 미접속 상태의 Cookie Session 조회 실패는 HTML 503")
    void returnsServiceUnavailableWhenCookieSessionCannotBeLoaded() throws Exception {
        // Given: Redis에 없는 Session Cookie
        // When: 보호 Page 요청과 Redis Session 조회 시도
        HttpResponse<String> response = sendPageRequest(
                "/home",
                MISSING_SESSION_COOKIE
        );

        // Then: 보안 Header를 포함한 HTML 503 응답
        assertHtmlServiceUnavailable(response);
    }

    @Test
    @DisplayName("Redis 미접속 상태의 BFF Session 조회 실패는 공통 JSON 503")
    void returnsJsonServiceUnavailableForBffRequest() throws Exception {
        // Given: Redis에 없는 Session Cookie
        // When: BFF 요청의 Redis Session 조회 시도
        HttpResponse<String> response = sendRequest(
                "/bff/v1/example",
                MISSING_SESSION_COOKIE,
                "application/json"
        );

        // Then: HTML 오류 Page가 아닌 공통 JSON 503 응답
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.headers().firstValue(HttpHeaders.CACHE_CONTROL))
                .contains("no-store");
        assertThat(response.headers().firstValue(HttpHeaders.CONTENT_TYPE))
                .hasValueSatisfying(contentType -> assertThat(contentType)
                        .startsWith("application/json"));
        assertThat(response.body())
                .contains("\"code\":\"COMMON_SERVICE_UNAVAILABLE\"")
                .contains("\"path\":\"/bff/v1/example\"");
    }

    private HttpResponse<String> sendPageRequest(
            String path,
            String cookie
    ) throws Exception {
        return sendRequest(path, cookie, "text/html");
    }

    private HttpResponse<String> sendRequest(
            String path,
            String cookie,
            String accept
    ) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + serverPort + path))
                .timeout(Duration.ofSeconds(5))
                .header(HttpHeaders.ACCEPT, accept)
                .GET();
        if (cookie != null) {
            builder.header(HttpHeaders.COOKIE, cookie);
        }
        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void assertHtmlServiceUnavailable(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.headers().firstValue(HttpHeaders.CACHE_CONTROL))
                .contains("no-store");
        assertThat(response.headers().firstValue(HttpHeaders.CONTENT_TYPE))
                .hasValueSatisfying(contentType -> assertThat(contentType)
                        .startsWith("text/html"));
        assertThat(response.headers().firstValue("X-Content-Type-Options"))
                .contains("nosniff");
        assertThat(response.headers().firstValue("X-Frame-Options"))
                .contains("DENY");
        assertThat(response.body()).contains("요청을 처리하지 못했습니다");
    }
}
