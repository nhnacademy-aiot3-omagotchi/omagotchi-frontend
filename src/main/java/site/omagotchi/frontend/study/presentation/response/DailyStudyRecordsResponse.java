package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.DailyStudyRecordsView;

import java.time.LocalDate;
import java.util.List;

public record DailyStudyRecordsResponse(
        LocalDate aggregationDate,
        long totalStudySeconds,
        List<StudyRecordResponse> records
) {

    public DailyStudyRecordsResponse {
        records = List.copyOf(records);
    }

    public static DailyStudyRecordsResponse from(DailyStudyRecordsView view) {
        return new DailyStudyRecordsResponse(
                view.aggregationDate(),
                view.totalStudySeconds(),
                view.records().stream()
                        .map(StudyRecordResponse::from)
                        .toList()
        );
    }
}
