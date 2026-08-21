package site.omagotchi.frontend.learning.presentation;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/gamification")
public class GamificationBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/characters")
    public JsonNode getCharacters(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getCharacters(context.bearerToken()));
    }

    @PostMapping("/characters/representative")
    public JsonNode createRepresentative(
            HttpServletRequest request,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .createRepresentativeCharacter(context.bearerToken(), body));
    }

    @GetMapping("/home")
    public JsonNode getHome(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getGamificationHome(context.bearerToken()));
    }

    @GetMapping("/quests/daily")
    public JsonNode getDailyQuests(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getDailyQuests(context.bearerToken()));
    }

    @PostMapping("/quests/{questId}/claim")
    public JsonNode claimQuest(
            HttpServletRequest request,
            @PathVariable Long questId
    ) {
        return proxy.execute(request, context -> context.service()
                .claimQuest(context.bearerToken(), questId));
    }

    @GetMapping("/progression")
    public JsonNode getProgression(
            HttpServletRequest request,
            @RequestParam Long cohortId,
            @RequestParam String aggregationDate
    ) {
        return proxy.execute(request, context -> context.service().getProgression(
                context.bearerToken(), cohortId, aggregationDate
        ));
    }
}
