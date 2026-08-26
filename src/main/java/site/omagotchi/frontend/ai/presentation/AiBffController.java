package site.omagotchi.frontend.ai.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import site.omagotchi.frontend.ai.infrastructure.AiChatGatewayClient;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/ai")
public class AiBffController {

    private final AiChatGatewayClient aiChatGatewayClient;
    private final LearningSessionAuthorization learningSessionAuthorization;

    @GetMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chat(
            HttpServletRequest request,
            @RequestParam String question
    ) {
        String bearerToken = this.learningSessionAuthorization.bearerToken(request);

        return this.aiChatGatewayClient.streamChat(bearerToken, question);
    }
}
