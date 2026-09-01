package site.omagotchi.frontend.ai.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.support.WebClientHttpServiceGroupConfigurer;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import(AiChatHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class AiChatHttpServiceConfigTest {

    private static final String BEARER = "Bearer test-access-token";

    @Autowired
    private AiChatHttpService httpService;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @Test
    @DisplayName("AI 채팅은 WebClient 기반 Learning 전용 그룹으로 SSE를 요청한다")
    void requestsLearningChatAsServerSentEvents() {
        // Given: WebClient 기반 HTTP Service Client가 반환할 SSE 응답
        mockHttpServiceConfiguration.respondWith("data: 안녕\n\n");

        // When: 사용자 JWT와 질문·모델을 전달해 채팅 스트림 호출
        List<String> chunks = httpService.streamChat(BEARER, "광주 날씨", "GEMINI")
                .collectList()
                .block(Duration.ofSeconds(1));

        // Then: Learning 채팅 경로·인증·SSE 계약과 전용 Client Group
        ClientRequest request = mockHttpServiceConfiguration.request();
        assertThat(AiChatHttpServiceConfig.GROUP_NAME).isEqualTo("learning-ai-service");
        assertThat(request.url())
                .hasScheme("http")
                .hasHost("localhost")
                .hasPort(8084);
        assertThat(request.url().getPath()).isEqualTo("/api/v1/chat");
        List<String> encodedQuestions = UriComponentsBuilder.fromUri(request.url())
                .build()
                .getQueryParams()
                .get("question");
        assertThat(encodedQuestions)
                .singleElement()
                .satisfies(encodedQuestion -> assertThat(UriUtils.decode(
                        encodedQuestion,
                        StandardCharsets.UTF_8
                )).isEqualTo("광주 날씨"));
        assertThat(UriComponentsBuilder.fromUri(request.url()).build().getQueryParams())
                .containsEntry("model", List.of("GEMINI"));
        assertThat(request.headers().getFirst(HttpHeaders.AUTHORIZATION)).isEqualTo(BEARER);
        assertThat(request.headers().getAccept()).contains(MediaType.TEXT_EVENT_STREAM);
        assertThat(chunks).containsExactly("안녕");
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private final AtomicReference<ClientRequest> request = new AtomicReference<>();
        private final AtomicReference<String> responseBody = new AtomicReference<>();

        @Bean
        WebClientHttpServiceGroupConfigurer learningAiMockConfigurer() {
            return groups -> groups
                    .filterByName(AiChatHttpServiceConfig.GROUP_NAME)
                    .forEachClient((ignoredGroup, builder) -> builder.exchangeFunction(request -> {
                        this.request.set(request);
                        return Mono.just(ClientResponse.create(HttpStatus.OK)
                                .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE)
                                .body(Objects.requireNonNull(this.responseBody.get()))
                                .build());
                    }));
        }

        void respondWith(String body) {
            responseBody.set(body);
        }

        ClientRequest request() {
            return Objects.requireNonNull(request.get(), "AI 채팅 요청 미실행");
        }
    }
}
