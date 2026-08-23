package site.omagotchi.frontend.learning.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

import java.time.LocalDate;

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

    @PostMapping("/quests/actions/character-checked")
    public JsonNode completeCharacterCheckedQuest(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .completeCharacterCheckedQuest(context.bearerToken()));
    }

    @PostMapping("/quests/actions/routine-reviewed")
    public JsonNode completeRoutineReviewedQuest(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .completeRoutineReviewedQuest(context.bearerToken()));
    }

    // Learning 계약과 동일하게 사용자별 일일 Quest 인스턴스 ID를 받는다.
    // Quest 정의 ID를 전달하면 하류에서 조회에 실패하므로 이름으로 의미를 고정한다.
    @PostMapping("/quests/{userDailyQuestId}/claim")
    public JsonNode claimQuest(
            HttpServletRequest request,
            @PathVariable Long userDailyQuestId
    ) {
        return proxy.execute(request, context -> context.service()
                .claimQuest(context.bearerToken(), userDailyQuestId));
    }

    // cohortId는 Browser에서 받지 않고 Session 기반 승인 기수에서 확보한다.
    // aggregationDate는 Learning에서 선택 값이므로 View도 선택 값으로 둔다.
    @GetMapping("/progression")
    public JsonNode getProgression(
            HttpServletRequest request,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate aggregationDate
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getProgression(
                        context.bearerToken(),
                        cohortId,
                        aggregationDate == null ? null : aggregationDate.toString()
                ));
    }
}
