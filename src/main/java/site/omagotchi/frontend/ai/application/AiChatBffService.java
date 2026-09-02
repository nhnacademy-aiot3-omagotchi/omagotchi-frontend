package site.omagotchi.frontend.ai.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.ai.application.port.AiChatClient;

@Service
@RequiredArgsConstructor
public class AiChatBffService {

    private final AiChatClient aiChatClient;

    public Flux<String> streamChat(String bearerToken, String question, String model) {
        return aiChatClient.streamChat(bearerToken, question, model);
    }
}
