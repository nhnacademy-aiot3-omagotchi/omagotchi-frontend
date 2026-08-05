package site.omagotchi.frontend.global.exception;

/**
 * Omagotchi HTTP API의 공통 오류 응답 형식.
 * Spring ProblemDetail 대신 서비스 공통 code·message·path 계약 유지.
 *
 * @param path 요청 URI. HTML 직접 삽입 금지.
 * @param requestId 요청 추적 ID. Frontend Request ID 도입 전까지 {@code null}.
 */
public record ApiErrorResponse(
        int status,
        String code,
        String message,
        String path,
        String requestId
) {
}
