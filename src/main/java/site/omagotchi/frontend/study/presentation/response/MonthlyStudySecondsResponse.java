package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.MonthlyStudySecondsView;

import java.time.YearMonth;
import java.util.List;

public record MonthlyStudySecondsResponse(
        YearMonth aggregationMonth,
        long totalStudySeconds,
        List<DailyStudySecondsResponse> dailyTotals
) {

    public MonthlyStudySecondsResponse {
        dailyTotals = List.copyOf(dailyTotals);
    }

    public static MonthlyStudySecondsResponse from(MonthlyStudySecondsView view) {
        return new MonthlyStudySecondsResponse(
                view.aggregationMonth(),
                view.totalStudySeconds(),
                view.dailyTotals().stream()
                        .map(DailyStudySecondsResponse::from)
                        .toList()
        );
    }
}
