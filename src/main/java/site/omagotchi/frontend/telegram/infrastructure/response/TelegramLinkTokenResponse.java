package site.omagotchi.frontend.telegram.infrastructure.response;

import java.time.Instant;

/**
 * 연동 딥링크 발급 응답.
 *
 * <p>{@code linkUrl}은 Learning이 봇 사용자명과 1회용 토큰으로 조립한 값이다. View는 문자열을
 * 그대로 전달하며 봇 사용자명이나 토큰을 따로 알지 않는다.
 */
public record TelegramLinkTokenResponse(
        String linkUrl,
        Instant expiresAt
) {
}
