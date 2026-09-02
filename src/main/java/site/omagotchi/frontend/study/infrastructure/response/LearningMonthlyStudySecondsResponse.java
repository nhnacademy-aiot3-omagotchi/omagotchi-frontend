package site.omagotchi.frontend.study.infrastructure.response;

import java.time.YearMonth;
import java.util.List;

public record LearningMonthlyStudySecondsResponse(
        YearMonth aggregationMonth,
        Long totalStudySeconds,
        List<LearningDailyStudySecondsResponse> dailyTotals
) {
}
