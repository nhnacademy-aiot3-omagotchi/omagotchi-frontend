package site.omagotchi.frontend.auth.application.result;

import site.omagotchi.frontend.auth.domain.GlobalRole;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

// 브라우저 Redis Session에 보관할 Identity Token 묶음
public record BrowserSessionTokenBundle(
        UUID userId,
        GlobalRole globalRole,
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Override
    public String toString() {
        return "BrowserSessionTokenBundle[userId=" + userId
                + ", globalRole=" + globalRole
                + ", accessToken=[REDACTED]"
                + ", accessTokenExpiresAt=" + accessTokenExpiresAt
                + ", refreshToken=[REDACTED]"
                + ", refreshTokenExpiresAt=" + refreshTokenExpiresAt + "]";
    }
}
