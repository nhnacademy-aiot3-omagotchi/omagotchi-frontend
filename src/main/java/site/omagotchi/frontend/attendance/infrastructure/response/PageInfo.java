package site.omagotchi.frontend.attendance.infrastructure.response;

public record PageInfo(
        int number,
        int size,
        long totalElements,
        int totalPages
) {
}
