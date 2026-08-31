package site.omagotchi.frontend.telegram.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import tools.jackson.databind.JsonNode;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/me/telegram")
public class TelegramBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/link")
    public JsonNode getMyLink(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getMyTelegramLink(context.bearerToken()));
    }

    @PostMapping("/link-token")
    public JsonNode issueLinkToken(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .issueTelegramLinkToken(context.bearerToken()));
    }

    @PatchMapping("/link/notification")
    public JsonNode updateNotification(
            HttpServletRequest request,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateTelegramNotification(context.bearerToken(), body));
    }

    @DeleteMapping("/link")
    public JsonNode disconnect(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .disconnectTelegram(context.bearerToken()));
    }
}
