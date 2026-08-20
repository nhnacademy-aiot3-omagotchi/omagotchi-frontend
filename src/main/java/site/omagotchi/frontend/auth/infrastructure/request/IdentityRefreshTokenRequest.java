package site.omagotchi.frontend.auth.infrastructure.request;

public record IdentityRefreshTokenRequest(
        String refreshToken
) {

    // 요청 로그의 Refresh Token 마스킹
    @Override
    public String toString() {
        return "IdentityRefreshTokenRequest[refreshToken=[REDACTED]]";
    }
}
