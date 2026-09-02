package site.omagotchi.frontend.study.application.result;

import java.time.YearMonth;
import java.util.List;

public record MonthlyStudySecondsView(
        YearMonth aggregationMonth,
        long totalStudySeconds,
        List<DailyStudySecondsView> dailyTotals
) {

    public MonthlyStudySecondsView {
        dailyTotals = List.copyOf(dailyTotals);
    }
}
