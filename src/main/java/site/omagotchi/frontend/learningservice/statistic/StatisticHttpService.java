package site.omagotchi.frontend.learningservice.statistic;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.CohortResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.DownstreamMemberPageResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.ManagerMembershipResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberDailyRecordsResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberOverviewResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TodayResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TrendResponse;

import java.util.List;

@HttpExchange("/api/v1/cohorts")
public interface StatisticHttpService {

    @GetExchange
    ResponseEntity<List<CohortResponse>> getCohorts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/join-requests/me")
    ResponseEntity<List<ManagerMembershipResponse>> getMyMemberships(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/{cohortId}/study-statistics/today")
    ResponseEntity<TodayResponse> getToday(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/{cohortId}/study-statistics/trend")
    ResponseEntity<TrendResponse> getTrend(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String window
    );

    @GetExchange("/{cohortId}/study-statistics/members")
    ResponseEntity<DownstreamMemberPageResponse> getMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String window,
            @RequestParam Integer page,
            @RequestParam Integer size,
            @RequestParam String sort
    );

    @GetExchange("/{cohortId}/study-statistics/members/{cohortMembershipId}/overview")
    ResponseEntity<MemberOverviewResponse> getMemberOverview(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long cohortMembershipId,
            @RequestParam String window
    );

    @GetExchange("/{cohortId}/study-statistics/members/{cohortMembershipId}/records")
    ResponseEntity<MemberDailyRecordsResponse> getMemberDailyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long cohortMembershipId,
            @RequestParam String date
    );
}
