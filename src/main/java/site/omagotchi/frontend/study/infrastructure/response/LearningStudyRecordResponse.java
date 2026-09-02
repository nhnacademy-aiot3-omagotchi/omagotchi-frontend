package site.omagotchi.frontend.study.infrastructure.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LearningStudyRecordResponse(
        UUID id,
        LocalDate aggregationDate,
        Instant startTime,
        Instant endTime,
        Long studySeconds,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
