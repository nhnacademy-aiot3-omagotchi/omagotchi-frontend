package site.omagotchi.frontend.study.infrastructure.response;

import java.time.LocalDate;

public record LearningDailyStudySecondsResponse(
        LocalDate aggregationDate,
        Long studySeconds
) {
}
