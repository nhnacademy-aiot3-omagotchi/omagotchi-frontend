package site.omagotchi.frontend.global.application.result;

/** Application 계층의 페이지 계산 결과다. HTTP 응답 형식과 독립적으로 사용한다. */
public record PageMetadata(
        int number,
        int size,
        long totalElements,
        int totalPages
) {
}
