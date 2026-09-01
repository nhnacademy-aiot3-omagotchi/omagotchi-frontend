package site.omagotchi.frontend.global.http.response;

public record PageInfo(
        int number,
        int size,
        long totalElements,
        int totalPages
) {
}
