package site.omagotchi.frontend.ai.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
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

    @GetMapping(value = "/chat", produces = "text/event-stream;charset=UTF-8")
    public Flux<String> chat(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestParam String question,
            @RequestParam(defaultValue = "GEMINI") String model
    ) {
        response.setCharacterEncoding("UTF-8");
        String bearerToken = this.learningSessionAuthorization.bearerToken(request);

        return this.aiChatGatewayClient.streamChat(bearerToken, question, model);
    }
}
