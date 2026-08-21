package site.omagotchi.frontend.learning.infrastructure;

import lombok.Getter;
import org.springframework.http.HttpStatusCode;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;

@Getter
public class LearningDownstreamException extends RuntimeException {

    private final HttpStatusCode statusCode;
    private final transient ApiErrorResponse errorResponse;

    public LearningDownstreamException(
            HttpStatusCode statusCode,
            ApiErrorResponse errorResponse,
            Throwable cause
    ) {
        super(errorResponse.code() + ": " + errorResponse.message(), cause);
        this.statusCode = statusCode;
        this.errorResponse = errorResponse;
    }
}
