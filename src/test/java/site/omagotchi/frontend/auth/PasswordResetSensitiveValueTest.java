package site.omagotchi.frontend.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import site.omagotchi.frontend.auth.application.command.PasswordResetCommand;
import site.omagotchi.frontend.auth.application.command.PasswordResetEmailChallengeCommand;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetEmailChallengeRequest;
import site.omagotchi.frontend.auth.infrastructure.request.IdentityPasswordResetRequest;
import site.omagotchi.frontend.auth.presentation.bff.request.PasswordResetEmailChallengeRequest;
import site.omagotchi.frontend.auth.presentation.bff.request.PasswordResetRequest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetSensitiveValueTest {

    private static final String EMAIL = "sensitive@example.com";
    private static final String PASSWORD = "sensitive-password-value";
    private static final String CODE = "654321";
    private static final UUID CHALLENGE_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000900001"
    );

    @Test
    @DisplayName("비밀번호 재설정 요청 객체의 민감값 문자열 노출 방지")
    void redactsPasswordResetRequestValues() {
        PasswordResetEmailChallengeCommand emailCommand =
                new PasswordResetEmailChallengeCommand(EMAIL);
        PasswordResetCommand command = new PasswordResetCommand(
                EMAIL,
                PASSWORD,
                CHALLENGE_ID,
                CODE
        );

        assertRedacted(new PasswordResetEmailChallengeRequest(EMAIL));
        assertRedacted(emailCommand);
        assertRedacted(IdentityPasswordResetEmailChallengeRequest.from(emailCommand));
        assertRedacted(new PasswordResetRequest(EMAIL, PASSWORD, CHALLENGE_ID, CODE));
        assertRedacted(command);
        assertRedacted(IdentityPasswordResetRequest.from(command));
    }

    // 요청 객체 문자열의 실제 이메일·비밀번호·OTP 포함 여부 검증
    private static void assertRedacted(Object value) {
        assertThat(value.toString())
                .contains("sensitive fields redacted")
                .doesNotContain(EMAIL, PASSWORD, CODE);
    }
}
