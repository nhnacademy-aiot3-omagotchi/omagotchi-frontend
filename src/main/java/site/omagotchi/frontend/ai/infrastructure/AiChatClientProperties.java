package site.omagotchi.frontend.ai.infrastructure;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

// AI 채팅(SSE)은 다른 내부 호출과 응답 특성이 달라 읽기 타임아웃을 따로 둔다
// 일반 REST는 수백 ms 안에 응답이 시작되지만, 채팅은 모델 1차 호출 → Tool 실행 → 모델 2차 호출을
// 거친 뒤에야 첫 바이트가 나가므로 그 동안 읽히는 바이트가 없다
// 전역 spring.http.clients.read-timeout(5s)을 그대로 쓰면 느린 응답이 항상 끊긴다
@Validated
@ConfigurationProperties(prefix = "clients.ai-chat")
public record AiChatClientProperties(

        @NotNull(message = "clients.ai-chat.read-timeout은 필수입니다.")
        Duration readTimeout
) {
}
