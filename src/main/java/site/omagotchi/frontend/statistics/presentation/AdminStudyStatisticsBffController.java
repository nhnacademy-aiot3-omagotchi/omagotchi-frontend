package site.omagotchi.frontend.statistics.presentation;

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

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/cohorts/{cohort-id}/study-statistics")
public class AdminStudyStatisticsBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/today")
    public JsonNode getToday(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId
    ) {
        return proxy.execute(request, context -> context.service()
                .getStudyStatisticsToday(context.bearerToken(), cohortId));
    }

    @GetMapping("/trend")
    public JsonNode getTrend(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String window
    ) {
        return proxy.execute(request, context -> context.service()
                .getStudyStatisticsTrend(context.bearerToken(), cohortId, window));
    }

    @GetMapping("/members")
    public JsonNode getMembers(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String window,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    ) {
        return proxy.execute(request, context -> context.service()
                .getStudyStatisticsMembers(
                        context.bearerToken(),
                        cohortId,
                        window,
                        page,
                        size,
                        sort
                ));
    }

    @GetMapping("/members/{cohort-membership-id}/overview")
    public JsonNode getMemberOverview(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("cohort-membership-id") Long cohortMembershipId,
            @RequestParam String window
    ) {
        return proxy.execute(request, context -> context.service()
                .getStudyStatisticsMemberOverview(
                        context.bearerToken(),
                        cohortId,
                        cohortMembershipId,
                        window
                ));
    }

    @GetMapping("/members/{cohort-membership-id}/records")
    public JsonNode getMemberDailyRecords(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("cohort-membership-id") Long cohortMembershipId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return proxy.execute(request, context -> context.service()
                .getStudyStatisticsMemberDailyRecords(
                        context.bearerToken(),
                        cohortId,
                        cohortMembershipId,
                        date.toString()
                ));
    }
}
