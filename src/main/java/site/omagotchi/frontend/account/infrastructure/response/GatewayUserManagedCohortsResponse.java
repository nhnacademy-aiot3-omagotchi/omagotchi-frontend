package site.omagotchi.frontend.account.infrastructure.response;

import java.util.List;
import java.util.UUID;

public record GatewayUserManagedCohortsResponse(
        UUID userId,
        List<GatewayManagedCohortResponse> cohorts
) {
}
