package site.omagotchi.frontend.learning.infrastructure.request;

public record LearningUpdateSpaceRequest(
        String name,
        String type,
        Integer capacity
) {
}
