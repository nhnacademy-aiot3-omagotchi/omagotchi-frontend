package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.DailyStudySecondsView;

import java.time.LocalDate;

public record DailyStudySecondsResponse(
        LocalDate aggregationDate,
        long studySeconds
) {

    public static DailyStudySecondsResponse from(DailyStudySecondsView view) {
        return new DailyStudySecondsResponse(
                view.aggregationDate(),
                view.studySeconds()
        );
    }
}
