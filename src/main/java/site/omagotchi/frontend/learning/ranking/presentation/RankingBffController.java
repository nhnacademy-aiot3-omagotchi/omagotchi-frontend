package site.omagotchi.frontend.learning.ranking.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.learning.ranking.domain.StudyRankingPeriod;

/**
 * 학습 랭킹 Browser 계약.
 *
 * <p>이전 경로는 /bff/v1/cohorts/{cohortId}/study-rankings 로 cohortId를 Browser가 지정했다.
 * 조회 대상 기수는 로그인 사용자의 승인 기수로 결정되어야 하므로 경로에서 제거하고
 * Session 기반으로 확보한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/study-rankings")
public class RankingBffController {

    private final LearningProxyBffService proxy;

    // period는 Enum이므로 잘못된 값은 하류 호출 전에 View가 400으로 거부한다.
    // maxRank는 Learning에서 선택 값이며, 미지정 시 하류 기본값을 따른다.
    @GetMapping
    public JsonNode getRankings(
            HttpServletRequest request,
            @RequestParam(defaultValue = "WEEKLY") StudyRankingPeriod period,
            @RequestParam(required = false) Integer maxRank
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getStudyRankings(context.bearerToken(), cohortId, period, maxRank));
    }

    @GetMapping("/me")
    public JsonNode getMyRanking(
            HttpServletRequest request,
            @RequestParam(defaultValue = "WEEKLY") StudyRankingPeriod period
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getMyStudyRanking(context.bearerToken(), cohortId, period));
    }
}
