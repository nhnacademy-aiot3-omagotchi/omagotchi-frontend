package site.omagotchi.frontend.study.infrastructure.response;

import java.time.LocalDate;
import java.util.List;

public record LearningDailyStudyRecordsResponse(
        LocalDate aggregationDate,
        Long totalStudySeconds,
        List<LearningStudyRecordResponse> records
) {
}
