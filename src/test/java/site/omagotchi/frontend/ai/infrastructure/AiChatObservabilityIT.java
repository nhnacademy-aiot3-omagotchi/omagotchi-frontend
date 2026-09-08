package site.omagotchi.frontend.ai.infrastructure;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import site.omagotchi.frontend.ai.application.AiChatBffService;
import site.omagotchi.frontend.ai.presentation.AiBffController;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.requestid.RequestId;
import site.omagotchi.frontend.global.requestid.RequestIdFilter;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.BDDAssertions.then;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

/** 실제 MVC 요청에서 SSE 구독을 거친 하류 HTTP의 식별자 전파 검증. 인증·외부 AI 연동 제외. */
@SpringBootTest(
        classes = AiChatObservabilityIT.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.config.name=ai-chat-observability-test",
                "server.address=127.0.0.1",
                "spring.cloud.discovery.enabled=false",
                "eureka.client.enabled=false",
                "spring.mvc.async.request-timeout=10s",
                "clients.ai-chat.read-timeout=5s",
                "management.tracing.sampling.probability=1.0",
                "management.tracing.propagation.type=w3c",
                "management.tracing.baggage.enabled=false",
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.session.autoconfigure.SessionAutoConfiguration,"
                        + "org.springframework.boot.session.data.redis.autoconfigure.SessionDataRedisAutoConfiguration"
        }
)
class AiChatObservabilityIT {

    private static final String REQUEST_ID = "Dev-Request_01.test";
    private static final String TRACE_ID = "11111111111111111111111111111111";
    private static final String TRACEPARENT = "00-" + TRACE_ID + "-2222222222222222-01";
    private static final AtomicReference<Headers> RECEIVED_HEADERS = new AtomicReference<>();

    private static HttpServer downstream;

    @Value("${local.server.port}")
    private int port;

    // 인증 흐름을 제외하고 실제 Controller·Service·HTTP Client 연결 유지
    @MockitoBean
    private LearningSessionAuthorization learningSessionAuthorization;

    @BeforeAll
    static void startDownstream() throws IOException {
        downstream = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        downstream.createContext("/api/v1/chat", exchange -> {
            try (exchange) {
                RECEIVED_HEADERS.set(exchange.getRequestHeaders());
                exchange.getResponseHeaders().set("Content-Type", "text/event-stream;charset=UTF-8");
                exchange.sendResponseHeaders(200, 0);
                exchange.getResponseBody().write("data: 안녕\n\n".getBytes(StandardCharsets.UTF_8));
            }
        });
        downstream.start();
    }

    @AfterAll
    static void stopDownstream() {
        if (downstream != null) {
            downstream.stop(0);
        }
    }

    @DynamicPropertySource
    static void downstreamBaseUrl(DynamicPropertyRegistry registry) {
        registry.add("spring.http.serviceclient.learning-ai-service.base-url",
                () -> "http://127.0.0.1:" + downstream.getAddress().getPort());
    }

    @Test
    @DisplayName("실제 MVC 요청에서 SSE 구독을 거친 하류 HTTP의 Request ID·Trace 전파")
    void propagatesRequestAndTraceContextThroughSseSubscription() throws Exception {
        // Given: 키 없이 고정 SSE를 반환하는 하류 서버와 외부 요청의 Trace Context
        given(this.learningSessionAuthorization.bearerToken(any()))
                .willReturn("Bearer test-only-access-token");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + this.port
                        + "/bff/v1/ai/chat?question=hello&model=GEMINI"))
                .header("Accept", "text/event-stream")
                .header(RequestId.HEADER_NAME, REQUEST_ID)
                .header("traceparent", TRACEPARENT)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        // When: 수동 Span 생성 없이 실제 MVC 요청과 SSE 응답 수신
        HttpResponse<String> response;
        try (HttpClient client = HttpClient.newHttpClient()) {
            response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        }

        // Then: 응답·하류 요청의 Request ID 유지와 동일 Trace의 새 Span 전파
        then(response.statusCode()).isEqualTo(200);
        then(response.body()).contains("data:", "안녕");
        then(response.headers().allValues(RequestId.HEADER_NAME)).containsExactly(REQUEST_ID);
        Headers headers = RECEIVED_HEADERS.get();
        then(headers).isNotNull();
        then(headers.get(RequestId.HEADER_NAME)).containsExactly(REQUEST_ID);
        then(headers.getFirst("traceparent"))
                .matches("00-" + TRACE_ID + "-[0-9a-f]{16}-01")
                .isNotEqualTo(TRACEPARENT);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    @EnableConfigurationProperties(AiChatClientProperties.class)
    @Import({
            AiBffController.class,
            AiChatBffService.class,
            LearningAiChatClient.class,
            AiChatHttpServiceConfig.class,
            RequestIdFilter.class
    })
    static class TestApplication {

        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                    .build();
        }
    }
}
