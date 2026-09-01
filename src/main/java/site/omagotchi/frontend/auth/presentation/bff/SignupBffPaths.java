package site.omagotchi.frontend.auth.presentation.bff;

// 이메일 OTP 기반 회원가입 Browser BFF의 v2 경로 계약
public final class SignupBffPaths {

    public static final String SIGNUP = "/bff/v2/auth/signup";
    public static final String EMAIL_OTP = SIGNUP + "/email-otp";

    private SignupBffPaths() {
    }
}
