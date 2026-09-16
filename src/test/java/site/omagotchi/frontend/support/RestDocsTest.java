package site.omagotchi.frontend.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.restdocs.operation.OperationRequest;
import org.springframework.restdocs.operation.OperationRequestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class RestDocsTest {

    @Test
    @DisplayName("민감값 치환 후 JSON 구조 보존")
    void preservesJsonStructure() {
        // Given: 이스케이프 문자와 빈 비밀번호가 포함된 요청
        String body =
                """
                {"email":"user@example.com","password":"pass\\\"word", "currentPassword":"",
                 "newPassword":"new-pass", "code":"123456", "challengeId":"challenge-example"}
                """;
        OperationRequest original = request(body, MediaType.APPLICATION_JSON);

        // When
        OperationRequest redacted = RestDocs.redactRequest(original);

        // Then
        JsonNode json = JsonMapper.builder().build().readTree(redacted.getContent());
        assertThat(json.size()).isEqualTo(6);
        assertThat(json.get("email").asString()).isEqualTo("user@example.com");
        for (String field :
                List.of("password", "currentPassword", "newPassword", "code", "challengeId")) {
            assertThat(json.get(field).asString()).isEqualTo("[REDACTED]");
        }
        assertThat(original.getContentAsString()).isEqualTo(body);
        assertThat(redacted.getHeaders().getContentLength())
                .isEqualTo(redacted.getContent().length);
    }

    @Test
    @DisplayName("로그인 폼 키와 CSRF 헤더 이름 보존")
    void preservesFormAndHeaders() {
        // Given: 비밀번호와 CSRF 토큰이 포함된 폼
        OperationRequest original =
                request(
                        "email=user%40example.com&password=test-password&_csrf=test-token",
                        MediaType.APPLICATION_FORM_URLENCODED);

        // When
        OperationRequest redacted = RestDocs.redactRequest(original);

        // Then
        assertThat(redacted.getContentAsString())
                .isEqualTo("email=user%40example.com&password=[REDACTED]&_csrf=[REDACTED]");
        assertThat(redacted.getHeaders().getFirst("X-CSRF-TOKEN")).isEqualTo("[CSRF_TOKEN]");
        assertThat(redacted.getHeaders().getFirst("X-XSRF-TOKEN")).isEqualTo("[CSRF_TOKEN]");
        assertThat(original.getHeaders().getFirst("X-CSRF-TOKEN")).isEqualTo("test-token");
    }

    @Test
    @DisplayName("CSRF 쿼리 치환 후 다른 조회 조건 보존")
    void preservesOtherQueryParameters() {
        // Given: JSON 요청의 쿼리로 전달된 CSRF 토큰
        OperationRequest original = new OperationRequestFactory().create(
                URI.create("https://example.com/settings?q=a%20b&_csrf=test-token&page=2"),
                HttpMethod.PATCH, "{}".getBytes(StandardCharsets.UTF_8),
                new HttpHeaders(), List.of(), List.of());

        // When
        OperationRequest redacted = RestDocs.redactRequest(original);

        // Then
        assertThat(redacted.getUri().getRawQuery()).isEqualTo("q=a%20b&_csrf=CSRF_TOKEN&page=2");
        assertThat(original.getUri().getRawQuery()).contains("_csrf=test-token");
    }

    private static OperationRequest request(String body, MediaType contentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType);
        headers.set("X-CSRF-TOKEN", "test-token");
        headers.set("X-XSRF-TOKEN", "test-token");
        return new OperationRequestFactory()
                .create(
                        URI.create("https://example.com/login"),
                        HttpMethod.POST,
                        body.getBytes(StandardCharsets.UTF_8),
                        headers,
                        List.of(),
                        List.of());
    }
}
