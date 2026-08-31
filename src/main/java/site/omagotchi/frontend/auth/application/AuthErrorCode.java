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
    INVALID_REFRESH_TOKEN(
            ErrorType.AUTHENTICATION,
            "AUTH_INVALID_REFRESH_TOKEN",
            "인증이 만료되었습니다. 다시 로그인해 주세요."
    );

    private final ErrorType type;
    private final String code;
    private final String message;
}
