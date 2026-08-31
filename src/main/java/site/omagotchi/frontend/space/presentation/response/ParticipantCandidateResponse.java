package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.ParticipantCandidateView;

import java.util.UUID;

public record ParticipantCandidateResponse(
        UUID userId,
        String displayName,
        String email,
        String status
) {
    public static ParticipantCandidateResponse from(ParticipantCandidateView view) {
        return new ParticipantCandidateResponse(
                view.userId(), view.displayName(), view.email(), view.status());
    }
}
