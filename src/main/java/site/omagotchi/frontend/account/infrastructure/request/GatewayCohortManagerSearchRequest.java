package site.omagotchi.frontend.account.infrastructure.request;

import java.util.List;
import java.util.UUID;

public record GatewayCohortManagerSearchRequest(List<UUID> userIds) {

    public GatewayCohortManagerSearchRequest {
        userIds = userIds == null ? List.of() : List.copyOf(userIds);
    }
}
