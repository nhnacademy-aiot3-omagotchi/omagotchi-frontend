package site.omagotchi.frontend.learning.infrastructure.response;

public record LearningSelectableLabResponse(
        Long spaceId,
        String name,
        Integer capacity,
        Long reservedCount
) {
}
