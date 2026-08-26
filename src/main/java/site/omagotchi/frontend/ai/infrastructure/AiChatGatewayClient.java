package site.omagotchi.frontend.ai.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Slf4j
@Component
public class AiChatGatewayClient {

    private final WebClient webClient;

    public AiChatGatewayClient(
            WebClient.Builder webClientBuilder,
            @Value("${spring.http.serviceclient.gateway-service.base-url}") String baseUrl
    ) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
    }

    public Flux<String> streamChat(String bearerToken, String question) {
        return this.webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/chat")
                        .queryParam("question", question)
                        .build())
                .header(HttpHeaders.AUTHORIZATION, bearerToken)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnError(e -> log.error("[AiChatGatewayClient] learning-service 채팅 호출 실패", e));
    }
}
