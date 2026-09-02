package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.StudyRecordView;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StudyRecordResponse(
        UUID id,
        LocalDate aggregationDate,
        Instant startTime,
        Instant endTime,
        long studySeconds,
        long version,
        Instant createdAt,
        Instant updatedAt
) {

    public static StudyRecordResponse from(StudyRecordView view) {
        return new StudyRecordResponse(
                view.id(),
                view.aggregationDate(),
                view.startTime(),
                view.endTime(),
                view.studySeconds(),
                view.version(),
                view.createdAt(),
                view.updatedAt()
        );
    }
}
