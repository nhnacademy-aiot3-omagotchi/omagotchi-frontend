package site.omagotchi.frontend.auth.application;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorType;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

    INVALID_CREDENTIALS(
            ErrorType.AUTHENTICATION,
            "AUTH_INVALID_CREDENTIALS",
            "이메일 또는 비밀번호가 올바르지 않습니다."
    ),
    INVALID_EMAIL(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_INVALID_EMAIL",
            "이메일은 올바른 주소 형식의 254자 이하여야 합니다."
    ),
    INVALID_PASSWORD(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_INVALID_PASSWORD",
            "비밀번호는 15~64자이며 제어 문자를 포함할 수 없습니다."
    ),
    INVALID_NAME(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_INVALID_NAME",
            "이름은 앞뒤 공백을 제외하고 1~30자여야 합니다."
    ),
    DUPLICATE_EMAIL(
            ErrorType.CONFLICT,
            "ACCOUNT_DUPLICATE_EMAIL",
            "이미 사용 중인 이메일입니다."
    );

    private final ErrorType type;
    private final String code;
    private final String message;
}
