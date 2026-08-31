package site.omagotchi.frontend.account.infrastructure.response;

import java.util.List;

public record GatewayAdminAccountPageResponse(
        List<GatewayAdminAccountResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
