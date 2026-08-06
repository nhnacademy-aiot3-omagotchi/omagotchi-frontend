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
    INVALID_SIGNUP_INPUT(
            ErrorType.INVALID_INPUT,
            "ACCOUNT_INVALID_SIGNUP_INPUT",
            "회원가입 정보가 올바르지 않습니다."
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
