package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.command.PasswordChangeCommand;
import site.omagotchi.frontend.auth.application.port.IdentityPasswordClient;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;

@Service
@RequiredArgsConstructor
public class PasswordChangeService {

    private final IdentityPasswordClient identityPasswordClient;

    public EmailVerificationChallenge requestEmailVerification(String bearerToken) {
        return identityPasswordClient.requestEmailVerification(bearerToken);
    }

    public void changePassword(
            String bearerToken,
            PasswordChangeCommand command
    ) {
        identityPasswordClient.changePassword(bearerToken, command);
    }
}
