package site.omagotchi.frontend.team.application.result;

import java.time.OffsetDateTime;
import java.util.List;

public record TeamDetailView(
        Long teamId,
        Long cohortId,
        String name,
        OffsetDateTime createdAt,
        int memberCount,
        Long myMemberId,
        String myRole,
        List<TeamMemberView> members
) {
    public TeamDetailView {
        members = List.copyOf(members);
    }
}
