package site.omagotchi.frontend.study.application.result;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StudyRecordView(
        UUID id,
        LocalDate aggregationDate,
        Instant startTime,
        Instant endTime,
        long studySeconds,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
