package site.omagotchi.frontend.ai.application.port;

import reactor.core.publisher.Flux;

public interface AiChatClient {

    Flux<String> streamChat(String bearerToken, String question, String model);
}
