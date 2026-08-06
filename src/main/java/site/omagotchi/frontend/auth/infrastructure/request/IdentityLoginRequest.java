package site.omagotchi.frontend.auth.infrastructure.request;

public record IdentityLoginRequest(
        String email,
        String password
) {

    // 요청 로그의 비밀번호 마스킹
    @Override
    public String toString() {
        return "IdentityLoginRequest[sensitive fields redacted]";
    }
}
