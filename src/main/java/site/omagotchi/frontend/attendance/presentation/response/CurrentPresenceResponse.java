package site.omagotchi.frontend.attendance.presentation.response;

import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;

import java.time.Instant;

public record CurrentPresenceResponse(
        Long spaceId,
        String state,
        Instant startedAt
) {

    public static CurrentPresenceResponse from(CurrentPresenceResult result) {
        return new CurrentPresenceResponse(
                result.spaceId(),
                result.state(),
                result.startedAt()
        );
    }
}
