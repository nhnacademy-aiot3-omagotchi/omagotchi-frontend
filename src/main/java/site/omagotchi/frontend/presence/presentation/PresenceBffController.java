package site.omagotchi.frontend.presence.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
public class PresenceBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/bff/v1/presence")
    public JsonNode getPresence(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getPresence(context.bearerToken()));
    }
}
