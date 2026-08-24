package site.omagotchi.frontend.learning.attendance.infrastructure.response;

public record PageInfo(
        int number,
        int size,
        long totalElements,
        int totalPages
) {
}
