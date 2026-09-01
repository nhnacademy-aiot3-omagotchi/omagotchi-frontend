package site.omagotchi.frontend.attendance.application.result;

import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.util.List;
import java.util.Objects;

public record AttendancePageResult(
        List<AttendanceRecordResult> items,
        PageMetadata page
) {

    public AttendancePageResult {
        items = items == null ? List.of() : List.copyOf(items);
        page = Objects.requireNonNull(page, "page");
    }
}
