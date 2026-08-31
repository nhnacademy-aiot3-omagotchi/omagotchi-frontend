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
            "비밀번호는 15~64자이며 공백만으로 구성하거나 제어 문자를 포함할 수 없습니다. 한글 등 일부 문자는 더 짧게 입력해야 합니다."
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
    ),
    CURRENT_PASSWORD_MISMATCH(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_CURRENT_PASSWORD_MISMATCH",
            "현재 비밀번호가 올바르지 않습니다."
    ),
    PASSWORD_UNCHANGED(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_PASSWORD_UNCHANGED",
            "새 비밀번호는 현재 비밀번호와 달라야 합니다."
    ),
    PASSWORD_CHANGE_NOT_ALLOWED(
            ErrorType.AUTHORIZATION,
            "ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED",
            "현재 계정 상태에서는 비밀번호를 변경할 수 없습니다."
    ),
    EMAIL_VERIFICATION_INVALID(
            ErrorType.INVALID_INPUT,
            "EMAIL_VERIFICATION_INVALID_CHALLENGE",
            "인증 코드가 올바르지 않거나 만료되었습니다."
    ),
    EMAIL_VERIFICATION_COOLDOWN_ACTIVE(
            ErrorType.RATE_LIMIT,
            "EMAIL_VERIFICATION_COOLDOWN_ACTIVE",
            "잠시 후 인증 코드를 다시 요청해 주세요."
    );

    private final ErrorType type;
    private final String code;
    private final String message;
}
