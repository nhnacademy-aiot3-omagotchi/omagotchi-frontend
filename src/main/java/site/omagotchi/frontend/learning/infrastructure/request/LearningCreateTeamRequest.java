package site.omagotchi.frontend.learning.infrastructure.request;

public record LearningCreateTeamRequest(
        Long cohortId,
        String name
) {
}
