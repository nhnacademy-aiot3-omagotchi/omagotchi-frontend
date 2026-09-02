package site.omagotchi.frontend.space.application.result;

public record SelectableLabView(
        Long spaceId,
        String name,
        Integer capacity,
        long reservedCount
) {
}
