package site.omagotchi.frontend.learningservice.statistic;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
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
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.CohortResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberDailyRecordsResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberOverviewResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.MemberPageResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TodayResponse;
import site.omagotchi.frontend.learningservice.statistic.StatisticModels.TrendResponse;

import java.time.LocalDate;
import java.util.List;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/manager/cohorts")
public class StatisticBffController {

    private static final String WINDOW_PATTERN = "(?:[7-9]|[1-5][0-9]|60)d";
    private static final String SORT_PATTERN =
            "(?:periodStudySeconds|todayStudySeconds|activeStudyDays|recordCount|lastStudiedAt|cohortMembershipId),(?:asc|desc)";

    private final StatisticBffService service;
    private final LearningSessionAccessTokenProvider accessTokenProvider;

    @GetMapping
    public List<CohortResponse> getManagedCohorts(HttpServletRequest request) {
        return service.getManagedCohorts(accessTokenProvider.require(request));
    }

    @GetMapping("/{cohortId}/study-statistics/today")
    public TodayResponse getToday(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId
    ) {
        return service.getToday(accessTokenProvider.require(request), cohortId);
    }

    @GetMapping("/{cohortId}/study-statistics/trend")
    public TrendResponse getTrend(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam @Pattern(regexp = WINDOW_PATTERN) String window
    ) {
        return service.getTrend(accessTokenProvider.require(request), cohortId, window);
    }

    @GetMapping("/{cohortId}/study-statistics/members")
    public MemberPageResponse getMembers(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam @Pattern(regexp = WINDOW_PATTERN) String window,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "periodStudySeconds,desc")
            @Pattern(regexp = SORT_PATTERN) String sort
    ) {
        return service.getMembers(
                accessTokenProvider.require(request), cohortId, window, page, size, sort
        );
    }

    @GetMapping("/{cohortId}/study-statistics/members/{cohortMembershipId}/overview")
    public MemberOverviewResponse getMemberOverview(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long cohortMembershipId,
            @RequestParam @Pattern(regexp = WINDOW_PATTERN) String window
    ) {
        return service.getMemberOverview(
                accessTokenProvider.require(request), cohortId, cohortMembershipId, window
        );
    }

    @GetMapping("/{cohortId}/study-statistics/members/{cohortMembershipId}/records")
    public MemberDailyRecordsResponse getMemberDailyRecords(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable @Positive Long cohortMembershipId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return service.getMemberDailyRecords(
                accessTokenProvider.require(request), cohortId, cohortMembershipId, date
        );
    }
}
