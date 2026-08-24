package site.omagotchi.frontend.ranking.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/cohorts/{cohortId}/study-rankings")
public class AdminRankingBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getStudyRankings(
            HttpServletRequest request,
            @PathVariable Long cohortId,
            @RequestParam(defaultValue = "WEEKLY") String period,
            @RequestParam(defaultValue = "100") Integer maxRank
    ) {
        return proxy.execute(request, context -> context.service()
                .getManagedStudyRankings(context.bearerToken(), cohortId, period, maxRank));
    }
}
