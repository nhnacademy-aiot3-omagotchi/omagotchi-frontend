package site.omagotchi.frontend.telegram.infrastructure.response;

import java.time.Instant;
import java.util.UUID;

/**
 * 연동 상태 응답.
 *
 * <p>Telegram 표시 이름은 저장되지 않으므로 화면이 계정을 이름으로 보여줄 수 없다.
 * 연동됨 상태에서 쓸 수 있는 값은 {@code linkedAt}과 {@code notificationEnabled}다.
 */
public record TelegramUserLinkResponse(
        UUID userId,
        Long telegramUserId,
        Long telegramChatId,
        Boolean notificationEnabled,
        Instant linkedAt,
        Instant disconnectedAt
) {
}
