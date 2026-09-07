package site.omagotchi.frontend.auth.presentation.bff;

// 비밀번호 재설정 Browser BFF v2 경로 계약
public final class PasswordResetBffPaths {

    public static final String PASSWORD_RESET = "/bff/v2/auth/password-reset";
    public static final String EMAIL_OTP = PASSWORD_RESET + "/email-otp";

    private PasswordResetBffPaths() {
    }
}
