package site.omagotchi.frontend.profile.infrastructure.response;

public record CurrentCharacterResponse(
        String nickname,
        int level,
        long currentExp,
        long requiredExp,
        String name,
        String type,
        String colorId,
        String assetKey
) {
}
