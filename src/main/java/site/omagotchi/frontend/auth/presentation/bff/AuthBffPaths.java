package site.omagotchi.frontend.auth.presentation.bff;

// 회원가입·비밀번호 변경 Browser API의 v2 경로 계약
public final class AuthBffPaths {

    public static final String SIGNUP = "/bff/v2/auth/signup";
    public static final String SIGNUP_EMAIL_OTP = SIGNUP + "/email-otp";
    public static final String PASSWORD = "/bff/v2/users/me/password";
    public static final String PASSWORD_EMAIL_OTP = PASSWORD + "/email-otp";

    private AuthBffPaths() {
    }
}
