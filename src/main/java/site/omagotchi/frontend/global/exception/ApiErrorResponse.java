package site.omagotchi.frontend.global.exception;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Omagotchi HTTP API의 공통 오류 본문.
 * HTTP 상태는 실제 HTTP 응답 상태로만 전달하고 본문에 중복하지 않음.
 *
 * @param code Client 분기용 오류 식별자
 * @param message 사용자 표시용 오류 설명
 * @param path 요청 URI. HTML 직접 삽입 금지.
 * @param requestId 요청 추적 ID. Frontend Request ID 도입 전까지 {@code null}.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ApiErrorResponse(
        String code,
        String message,
        String path,
        String requestId
) {

    public static ApiErrorResponse of(
            ErrorCode errorCode,
            String path
    ) {
        return of(
                errorCode,
                errorCode.message(),
                path
        );
    }

    public static ApiErrorResponse of(
            ErrorCode errorCode,
            String message,
            String path
    ) {
        return new ApiErrorResponse(
                errorCode.code(),
                message,
                path,
                null
        );
    }
}
