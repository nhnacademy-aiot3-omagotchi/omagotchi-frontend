package site.omagotchi.frontend.global.exception;

import lombok.Getter;

import java.util.Objects;

/**
 * Frontend가 외부에 공개할 실패 의미를 확정한 예상 가능한 실패.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final String diagnosticMessage;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, null, null);
    }

    public BusinessException(ErrorCode errorCode, Throwable cause) {
        this(errorCode, null, cause);
    }

    public BusinessException(ErrorCode errorCode, String diagnosticMessage) {
        this(errorCode, diagnosticMessage, null);
    }

    public BusinessException(
            ErrorCode errorCode,
            String diagnosticMessage,
            Throwable cause
    ) {
        super(buildMessage(errorCode, diagnosticMessage), cause);
        this.errorCode = errorCode;
        this.diagnosticMessage = diagnosticMessage;
    }

    private static String buildMessage(ErrorCode errorCode, String diagnosticMessage) {
        ErrorCode requiredErrorCode = requirePublicErrorCode(errorCode);
        return diagnosticMessage == null || diagnosticMessage.isBlank()
                ? requiredErrorCode.message()
                : requiredErrorCode.message() + " - " + diagnosticMessage;
    }

    private static ErrorCode requirePublicErrorCode(ErrorCode errorCode) {
        ErrorCode requiredErrorCode = Objects.requireNonNull(errorCode, "errorCode");
        if (requiredErrorCode.type() == ErrorType.INTERNAL) {
            throw new IllegalArgumentException(
                    "BusinessException은 INTERNAL 오류를 전달할 수 없습니다."
            );
        }
        return requiredErrorCode;
    }
}
