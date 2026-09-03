package site.omagotchi.frontend.team.application.result;

import java.time.OffsetDateTime;

public record TeamView(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt
) {
}
