package site.omagotchi.frontend.learningservice.ranking;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learningservice.common.LearningSessionAccessTokenProvider;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.MemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TeamRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayMemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayTeamRankingResponse;

import java.time.LocalDate;
import java.time.YearMonth;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/learning/cohorts/{cohortId}")
public class RankingBffController {

    private final RankingBffService service;
    private final LearningSessionAccessTokenProvider accessTokenProvider;

    @GetMapping("/study-rankings/today")
    public TodayMemberRankingResponse getTodayMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getTodayMembers(accessTokenProvider.require(request), cohortId, maxRank);
    }

    @GetMapping("/study-rankings/daily/{date}")
    public MemberRankingResponse getDailyMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getDailyMembers(accessTokenProvider.require(request), cohortId, date, maxRank);
    }

    @GetMapping("/study-rankings/weekly/{weekStartDate}")
    public MemberRankingResponse getWeeklyMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getWeeklyMembers(
                accessTokenProvider.require(request), cohortId, weekStartDate, maxRank
        );
    }

    @GetMapping("/study-rankings/monthly/{month}")
    public MemberRankingResponse getMonthlyMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(pattern = "uuuu-MM") YearMonth month,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getMonthlyMembers(accessTokenProvider.require(request), cohortId, month, maxRank);
    }

    @GetMapping("/study-rankings/teams/today")
    public TodayTeamRankingResponse getTodayTeams(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getTodayTeams(accessTokenProvider.require(request), cohortId, maxRank);
    }

    @GetMapping("/study-rankings/teams/daily/{date}")
    public TeamRankingResponse getDailyTeams(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getDailyTeams(accessTokenProvider.require(request), cohortId, date, maxRank);
    }

    @GetMapping("/study-rankings/teams/weekly/{weekStartDate}")
    public TeamRankingResponse getWeeklyTeams(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getWeeklyTeams(
                accessTokenProvider.require(request), cohortId, weekStartDate, maxRank
        );
    }

    @GetMapping("/study-rankings/teams/monthly/{month}")
    public TeamRankingResponse getMonthlyTeams(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @DateTimeFormat(pattern = "uuuu-MM") YearMonth month,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getMonthlyTeams(accessTokenProvider.require(request), cohortId, month, maxRank);
    }

    @GetMapping("/teams/{teamId}/study-rankings/today")
    public TodayMemberRankingResponse getTodayTeamMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long teamId,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getTodayTeamMembers(
                accessTokenProvider.require(request), cohortId, teamId, maxRank
        );
    }

    @GetMapping("/teams/{teamId}/study-rankings/daily/{date}")
    public MemberRankingResponse getDailyTeamMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long teamId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getDailyTeamMembers(
                accessTokenProvider.require(request), cohortId, teamId, date, maxRank
        );
    }

    @GetMapping("/teams/{teamId}/study-rankings/weekly/{weekStartDate}")
    public MemberRankingResponse getWeeklyTeamMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long teamId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getWeeklyTeamMembers(
                accessTokenProvider.require(request), cohortId, teamId, weekStartDate, maxRank
        );
    }

    @GetMapping("/teams/{teamId}/study-rankings/monthly/{month}")
    public MemberRankingResponse getMonthlyTeamMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long teamId,
            @PathVariable @DateTimeFormat(pattern = "uuuu-MM") YearMonth month,
            @RequestParam(required = false) @Min(1) @Max(1000) Integer maxRank
    ) {
        return service.getMonthlyTeamMembers(
                accessTokenProvider.require(request), cohortId, teamId, month, maxRank
        );
    }
}
