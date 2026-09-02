package site.omagotchi.frontend.attendance.presentation.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AttendanceSpaceRequest(
        @NotNull @Positive Long spaceId
) {
}
