package site.omagotchi.frontend.account.infrastructure.request;

public record IdentityChangePasswordRequest(
        String currentPassword,
        String newPassword
) {

    @Override
    public String toString() {
        return "IdentityChangePasswordRequest[sensitive fields redacted]";
    }
}
