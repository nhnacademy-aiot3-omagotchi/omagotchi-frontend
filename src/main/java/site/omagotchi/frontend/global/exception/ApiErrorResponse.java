package site.omagotchi.frontend.global.exception;

/**
 * Omagotchi HTTP API의 공통 오류 응답 형식.
 *
 * @param path 요청 URI. HTML 직접 삽입 금지.
 */
public record ApiErrorResponse(
        int status,
        String code,
        String message,
        String path
) {
}
