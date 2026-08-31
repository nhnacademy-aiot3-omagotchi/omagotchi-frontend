package site.omagotchi.frontend.learning.infrastructure.request;

public record LearningSpaceMutationRequest(
        String name,
        String type,
        Integer capacity,
        Long cohortId
) {
}
