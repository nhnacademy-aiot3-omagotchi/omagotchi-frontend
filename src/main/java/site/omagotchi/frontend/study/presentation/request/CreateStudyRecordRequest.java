package site.omagotchi.frontend.study.presentation.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record CreateStudyRecordRequest(
        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
        LocalDateTime startDateTime,

        @NotNull
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
        LocalDateTime endDateTime
) {
}
