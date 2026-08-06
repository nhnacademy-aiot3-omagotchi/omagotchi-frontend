package site.omagotchi.frontend.auth.infrastructure.request;

public record IdentitySignupRequest(
        String email,
        String password,
        String name
) {

    // 요청 로그의 비밀번호 마스킹
    @Override
    public String toString() {
        return "IdentitySignupRequest[sensitive fields redacted]";
    }
}
