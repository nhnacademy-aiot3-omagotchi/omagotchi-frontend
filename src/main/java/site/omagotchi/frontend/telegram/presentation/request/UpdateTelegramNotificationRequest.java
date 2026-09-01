package site.omagotchi.frontend.telegram.presentation.request;

import jakarta.validation.constraints.NotNull;

/**
 * 알림 수신 여부 변경 요청. Telegram 알림은 종류별 구분 없이 한 번에 켜고 끈다.
 */
public record UpdateTelegramNotificationRequest(
        @NotNull Boolean enabled
) {
}
