package site.omagotchi.frontend.ai.infrastructure;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.ai.application.port.AiChatClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class LearningAiChatClient implements AiChatClient {

    private final AiChatHttpService httpService;

    @Override
    public Flux<String> streamChat(String bearerToken, String question, String model) {
        return httpService.streamChat(bearerToken, question, model)
                .doOnError(exception -> log.error(
                        "[LearningAiChatClient] Learning AI 채팅 호출 실패",
                        exception
                ));
    }
}
