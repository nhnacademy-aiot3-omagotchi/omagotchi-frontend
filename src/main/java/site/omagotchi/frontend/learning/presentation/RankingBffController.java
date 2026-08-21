package site.omagotchi.frontend.learning.presentation;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/cohorts/{cohortId}/study-rankings")
public class RankingBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getRankings(
            HttpServletRequest request,
            @PathVariable Long cohortId,
            @RequestParam(defaultValue = "WEEKLY") String period,
            @RequestParam(defaultValue = "100") Integer maxRank
    ) {
        return proxy.execute(request, context -> context.service().getStudyRankings(
                context.bearerToken(), cohortId, period, maxRank
        ));
    }

    @GetMapping("/me")
    public JsonNode getMyRanking(
            HttpServletRequest request,
            @PathVariable Long cohortId,
            @RequestParam(defaultValue = "WEEKLY") String period
    ) {
        return proxy.execute(request, context -> context.service().getMyStudyRanking(
                context.bearerToken(), cohortId, period
        ));
    }
}
