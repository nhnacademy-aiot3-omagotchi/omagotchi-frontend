package site.omagotchi.frontend.global.logging;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.requestid.RequestId;
import site.omagotchi.frontend.global.requestid.RequestIdFilter;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.global.web.ApiExceptionHandler;
import site.omagotchi.frontend.global.web.PageBusinessExceptionHandler;
import site.omagotchi.frontend.global.web.UnhandledExceptionLoggingResolver;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.BDDAssertions.then;

@SpringBootTest(
        classes = HttpObservabilityIT.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.config.name=http-observability-test",
                "server.address=127.0.0.1",
                "spring.cloud.discovery.enabled=false",
                "eureka.client.enabled=false",
                "management.tracing.sampling.probability=1.0",
                "management.tracing.propagation.type=w3c",
                "management.tracing.baggage.enabled=false",
                "logging.level.site.omagotchi.frontend.global.logging.HttpAccessLogObservationHandler=INFO",
                "logging.structured.format.console=ecs",
                "logging.structured.ecs.service.environment=test",
                "logging.structured.json.exclude=traceId,spanId",
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.session.autoconfigure.SessionAutoConfiguration,"
                        + "org.springframework.boot.session.data.redis.autoconfigure.SessionDataRedisAutoConfiguration"
        }
)
@ExtendWith(OutputCaptureExtension.class)
class HttpObservabilityIT {

    private static final String REQUEST_ID = "0123456789abcdef0123456789abcdef";
    private static final String TRACE_ID = "11111111111111111111111111111111";
    private static final String TRACEPARENT =
            "00-" + TRACE_ID + "-2222222222222222-01";
    private static final String FAILURE_DETAIL = "local-diagnostic-detail";
    private static final JsonMapper JSON = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .build();

    @Value("${local.server.port}")
    private int port;

    @Test
    @DisplayName("접근 이벤트의 Request ID·W3C Trace Context·Route 연결")
    void connectsRequestAndTraceIdentifiers(CapturedOutput output) throws Exception {
        // Given
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port + "/probe/42"))
                .header(RequestId.HEADER_NAME, REQUEST_ID)
                .header("traceparent", TRACEPARENT)
                .GET()
                .build();

        // When
        HttpResponse<Void> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.discarding());

        // Then
        then(response.statusCode()).isEqualTo(204);
        JsonNode event = findEvent(output, "frontend.http");
        then(event.at("/http/request/id").asString()).isEqualTo(REQUEST_ID);
        then(event.at("/http/response/status_code").asInt()).isEqualTo(204);
        then(event.at("/omagotchi/http/route").asString())
                .isEqualTo("/probe/{item-id}");
        then(event.at("/trace/id").asString()).isEqualTo(TRACE_ID);
        then(event.at("/span/id").asString()).matches("^[0-9a-f]{16}$");
        then(event.has("traceId")).isFalse();
        then(event.has("spanId")).isFalse();
    }

    @Test
    @DisplayName("500 오류의 안전 이벤트와 로컬 진단 이벤트 연결")
    void separatesSafeAndDiagnosticFailureEvents(CapturedOutput output) throws Exception {
        // Given
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port + "/failure"))
                .header(RequestId.HEADER_NAME, REQUEST_ID)
                .header("traceparent", TRACEPARENT)
                .GET()
                .build();

        // When
        HttpResponse<Void> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.discarding());

        // Then
        then(response.statusCode()).isEqualTo(500);
        JsonNode errorEvent = findEvent(output, "frontend.error");
        JsonNode diagnosticEvent = findEvent(output, "frontend.diagnostic");
        then(errorEvent.at("/http/request/id").asString()).isEqualTo(REQUEST_ID);
        then(errorEvent.at("/trace/id").asString()).isEqualTo(TRACE_ID);
        then(errorEvent.at("/error/code").asString())
                .isEqualTo("COMMON_INTERNAL_SERVER_ERROR");
        then(errorEvent.at("/error/type").asString())
                .isEqualTo(IllegalStateException.class.getName());
        then(errorEvent.at("/omagotchi/error/stack_trace").asString())
                .contains(IllegalStateException.class.getName()).doesNotContain(FAILURE_DETAIL);
        then(errorEvent.at("/error/stack_trace").isMissingNode()).isTrue();
        then(errorEvent.toString()).doesNotContain(FAILURE_DETAIL);
        then(diagnosticEvent.at("/event/id").asString())
                .isEqualTo(errorEvent.at("/event/id").asString());
        then(diagnosticEvent.at("/error/message").asString()).isEqualTo(FAILURE_DETAIL);
        then(diagnosticEvent.at("/error/stack_trace").asString()).contains(FAILURE_DETAIL);
    }

    @Test
    @DisplayName("미처리 Page 예외의 기존 HTML 500 보존과 오류 이벤트 1회 기록")
    void recordsUnhandledPageFailureWithoutChangingHtmlResponse(CapturedOutput output) throws Exception {
        // Given
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port + "/page-failure"))
                .header(RequestId.HEADER_NAME, REQUEST_ID)
                .header("traceparent", TRACEPARENT)
                .header("Accept", MediaType.TEXT_HTML_VALUE)
                .GET()
                .build();

        // When
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        // Then: Boot /error의 기존 Template·상태 보존과 안전·진단 이벤트 연결
        then(response.statusCode()).isEqualTo(500);
        then(response.headers().firstValue("Content-Type").orElseThrow())
                .startsWith(MediaType.TEXT_HTML_VALUE);
        then(response.body()).contains("<html").doesNotContain(FAILURE_DETAIL);
        JsonNode errorEvent = findEvent(output, "frontend.error");
        JsonNode diagnosticEvent = findEvent(output, "frontend.diagnostic");
        then(errorEvent.at("/http/request/id").asString()).isEqualTo(REQUEST_ID);
        then(errorEvent.at("/trace/id").asString()).isEqualTo(TRACE_ID);
        then(errorEvent.at("/omagotchi/http/route").asString()).isEqualTo("/page-failure");
        then(errorEvent.at("/error/type").asString()).isEqualTo(IllegalStateException.class.getName());
        then(errorEvent.toString()).doesNotContain(FAILURE_DETAIL);
        then(diagnosticEvent.at("/event/id").asString())
                .isEqualTo(errorEvent.at("/event/id").asString());
        then(diagnosticEvent.at("/error/stack_trace").asString()).contains(FAILURE_DETAIL);
        then(findEvent(output, "frontend.http").at("/http/response/status_code").asInt())
                .isEqualTo(500);
    }

    @ParameterizedTest
    @CsvSource({"/page-not-found,404", "/page-forbidden,403"})
    @DisplayName("MVC·Security 처리 Page 4xx의 상태 보존과 내부 오류 이벤트 제외")
    void preservesFrameworkPageErrorWithoutLoggingInternalFailure(
            String path,
            int expectedStatus,
            CapturedOutput output
    ) throws Exception {
        // Given
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port + path))
                .header("Accept", MediaType.TEXT_HTML_VALUE)
                .GET()
                .build();

        // When
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        // Then
        then(response.statusCode()).isEqualTo(expectedStatus);
        then(response.body()).contains("<html");
        then(output.getAll()).doesNotContain("frontend.error", "frontend.diagnostic");
    }

    @Test
    @DisplayName("Page Advice가 처리한 503의 오류 이벤트 중복 방지")
    void doesNotDuplicateHandledPageFailure(CapturedOutput output) throws Exception {
        // Given
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port + "/page-unavailable"))
                .header(RequestId.HEADER_NAME, REQUEST_ID)
                .header("Accept", MediaType.TEXT_HTML_VALUE)
                .GET()
                .build();

        // When
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        // Then
        then(response.statusCode()).isEqualTo(503);
        then(response.body()).contains("<html");
        JsonNode errorEvent = findEvent(output, "frontend.error");
        then(errorEvent.at("/error/code").asString()).isEqualTo("COMMON_SERVICE_UNAVAILABLE");
        then(findEvent(output, "frontend.diagnostic").at("/event/id").asString())
                .isEqualTo(errorEvent.at("/event/id").asString());
    }

    private static JsonNode findEvent(CapturedOutput output, String dataset) {
        List<JsonNode> events = output.getAll().lines()
                .map(String::trim)
                .filter(line -> line.startsWith("{"))
                .map(HttpObservabilityIT::readJson)
                .filter(json -> dataset.equals(json.at("/event/dataset").asString()))
                .toList();
        then(events).singleElement();
        return events.getFirst();
    }

    private static JsonNode readJson(String line) {
        try {
            return JSON.readTree(line);
        } catch (Exception exception) {
            throw new AssertionError("구조화 로그 JSON 해석 실패", exception);
        }
    }

    @SpringBootConfiguration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    @Import({
            ProbeController.class,
            ProbePageController.class,
            TestSecurityConfiguration.class,
            RequestIdFilter.class,
            HttpAccessLogObservationHandler.class,
            HttpErrorEventLogger.class,
            ApiExceptionHandler.class,
            PageBusinessExceptionHandler.class,
            UnhandledExceptionLoggingResolver.class,
            BrowserSessionInvalidator.class
    })
    static class TestApplication {
    }

    @RestController
    static class ProbeController {

        @GetMapping("/probe/{item-id}")
        @ResponseStatus(HttpStatus.NO_CONTENT)
        void probe() {
        }

        @GetMapping("/failure")
        void failure() {
            throw new IllegalStateException(FAILURE_DETAIL);
        }
    }

    @Controller
    static class ProbePageController {

        @GetMapping("/page-failure")
        String failure() {
            throw new IllegalStateException(FAILURE_DETAIL);
        }

        @GetMapping("/page-not-found")
        String notFound() {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        @GetMapping("/page-forbidden")
        String forbidden() {
            throw new AccessDeniedException("permission denied");
        }

        @GetMapping("/page-unavailable")
        String unavailable() {
            throw new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE);
        }
    }

    @Configuration(proxyBeanMethods = false)
    static class TestSecurityConfiguration {

        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                    .build();
        }
    }
}
