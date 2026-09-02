package site.omagotchi.frontend.study.application.result;

import java.time.LocalDate;
import java.util.List;

public record DailyStudyRecordsView(
        LocalDate aggregationDate,
        long totalStudySeconds,
        List<StudyRecordView> records
) {

    public DailyStudyRecordsView {
        records = List.copyOf(records);
    }
}
