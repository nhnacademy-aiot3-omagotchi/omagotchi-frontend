package site.omagotchi.frontend.learning.infrastructure.response;

import java.util.List;

public record AttendanceRecordPageResponse(
        List<AttendanceRecordResponse> items,
        PageInfo page
) {
    public AttendanceRecordPageResponse {
        items = items == null ? List.of() : List.copyOf(items);
    }
}
