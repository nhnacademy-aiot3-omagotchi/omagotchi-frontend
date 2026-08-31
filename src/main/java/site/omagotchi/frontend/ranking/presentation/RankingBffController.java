package site.omagotchi.frontend.ranking.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * 학습 랭킹 Browser 계약.
 *
 * <p>이전 경로는 /bff/v1/cohorts/{cohort-id}/study-rankings 로 cohortId를 Browser가 지정했다.
 * 조회 대상 기수는 로그인 사용자의 승인 기수로 결정되어야 하므로 경로에서 제거하고
 * Session 기반으로 확보한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/study-rankings")
public class RankingBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/today")
    public JsonNode getTodayRanking(
            HttpServletRequest request,
            @RequestParam(required = false) Integer maxRank
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getTodayStudyRankings(context.bearerToken(), cohortId, maxRank));
    }

    @GetMapping("/daily/{date}")
    public JsonNode getDailyRanking(
            HttpServletRequest request,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer maxRank
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getDailyStudyRankings(
                        context.bearerToken(), cohortId, date.toString(), maxRank
                ));
    }

    @GetMapping("/weekly/{week-start-date}")
    public JsonNode getWeeklyRanking(
            HttpServletRequest request,
            @PathVariable("week-start-date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate,
            @RequestParam(required = false) Integer maxRank
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getWeeklyStudyRankings(
                        context.bearerToken(), cohortId, weekStartDate.toString(), maxRank
                ));
    }

    @GetMapping("/monthly/{month}")
    public JsonNode getMonthlyRanking(
            HttpServletRequest request,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            @RequestParam(required = false) Integer maxRank
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getMonthlyStudyRankings(
                        context.bearerToken(), cohortId, month.toString(), maxRank
                ));
    }
}
