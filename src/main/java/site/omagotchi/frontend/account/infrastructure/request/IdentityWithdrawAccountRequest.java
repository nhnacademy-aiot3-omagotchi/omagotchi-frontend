package site.omagotchi.frontend.account.infrastructure.request;

public record IdentityWithdrawAccountRequest(
        String currentPassword
) {

    @Override
    public String toString() {
        return "IdentityWithdrawAccountRequest[sensitive fields redacted]";
    }
}
