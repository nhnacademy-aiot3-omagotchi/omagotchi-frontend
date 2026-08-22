package site.omagotchi.frontend.learningservice.ranking;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.MemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TeamRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayMemberRankingResponse;
import site.omagotchi.frontend.learningservice.ranking.RankingModels.TodayTeamRankingResponse;

@HttpExchange("/api/v1/cohorts/{cohortId}")
public interface RankingHttpService {

    @GetExchange("/study-rankings/today")
    ResponseEntity<TodayMemberRankingResponse> getTodayMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/daily/{date}")
    ResponseEntity<MemberRankingResponse> getDailyMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String date,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/weekly/{weekStartDate}")
    ResponseEntity<MemberRankingResponse> getWeeklyMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String weekStartDate,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/monthly/{month}")
    ResponseEntity<MemberRankingResponse> getMonthlyMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String month,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/teams/today")
    ResponseEntity<TodayTeamRankingResponse> getTodayTeams(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/teams/daily/{date}")
    ResponseEntity<TeamRankingResponse> getDailyTeams(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String date,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/teams/weekly/{weekStartDate}")
    ResponseEntity<TeamRankingResponse> getWeeklyTeams(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String weekStartDate,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/study-rankings/teams/monthly/{month}")
    ResponseEntity<TeamRankingResponse> getMonthlyTeams(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String month,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/teams/{teamId}/study-rankings/today")
    ResponseEntity<TodayMemberRankingResponse> getTodayTeamMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long teamId,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/teams/{teamId}/study-rankings/daily/{date}")
    ResponseEntity<MemberRankingResponse> getDailyTeamMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long teamId,
            @PathVariable String date,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/teams/{teamId}/study-rankings/weekly/{weekStartDate}")
    ResponseEntity<MemberRankingResponse> getWeeklyTeamMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long teamId,
            @PathVariable String weekStartDate,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/teams/{teamId}/study-rankings/monthly/{month}")
    ResponseEntity<MemberRankingResponse> getMonthlyTeamMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long teamId,
            @PathVariable String month,
            @RequestParam(required = false) Integer maxRank
    );
}
