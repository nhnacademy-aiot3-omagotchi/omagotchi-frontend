package site.omagotchi.frontend.study.application.result;

import java.time.LocalDate;

public record DailyStudySecondsView(
        LocalDate aggregationDate,
        long studySeconds
) {
}
