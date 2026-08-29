package site.omagotchi.frontend.telegram.infrastructure.request;

/**
 * Learning의 알림 수신 여부 변경 요청 본문.
 *
 * <p>{@code Map}으로 보내면 키 오타가 컴파일에서 걸리지 않고 하류 400으로만 드러난다.
 */
public record TelegramNotificationRequest(
        boolean enabled
) {
}
