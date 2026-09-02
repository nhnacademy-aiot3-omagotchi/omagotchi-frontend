package site.omagotchi.frontend.global.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import java.util.Optional;

// ErrorType의 HTTP 상태 변환과 Spring MVC 상태의 공통 오류 매핑
public final class ErrorHttpMapper {

    private ErrorHttpMapper() {
    }

    // ErrorType의 HTTP 상태 변환
    public static HttpStatus toHttpStatus(ErrorType type) {
        return switch (type) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case METHOD_NOT_ALLOWED -> HttpStatus.METHOD_NOT_ALLOWED;
            case NOT_ACCEPTABLE -> HttpStatus.NOT_ACCEPTABLE;
            case UNSUPPORTED_MEDIA_TYPE -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            case CONFLICT -> HttpStatus.CONFLICT;
            case AUTHENTICATION -> HttpStatus.UNAUTHORIZED;
            case AUTHORIZATION -> HttpStatus.FORBIDDEN;
            case RATE_LIMIT -> HttpStatus.TOO_MANY_REQUESTS;
            case BAD_GATEWAY -> HttpStatus.BAD_GATEWAY;
            case SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case INTERNAL -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    // Spring MVC 상태의 공통 오류 매핑
    public static Optional<CommonErrorCode> findErrorCode(HttpStatusCode statusCode) {
        return switch (statusCode.value()) {
            case 400 -> Optional.of(CommonErrorCode.INVALID_REQUEST);
            case 404 -> Optional.of(CommonErrorCode.NOT_FOUND);
            case 405 -> Optional.of(CommonErrorCode.METHOD_NOT_ALLOWED);
            case 406 -> Optional.of(CommonErrorCode.NOT_ACCEPTABLE);
            case 415 -> Optional.of(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
            case 500 -> Optional.of(CommonErrorCode.INTERNAL_SERVER_ERROR);
            case 503 -> Optional.of(CommonErrorCode.SERVICE_UNAVAILABLE);
            default -> Optional.empty();
        };
    }
}
