package site.omagotchi.frontend.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.account.application.port.IdentityAccountClient;
import site.omagotchi.frontend.account.application.result.AccountSettings;

@Service
@RequiredArgsConstructor
public class AccountSettingsBffService {

    private final IdentityAccountClient identityAccountClient;

    public AccountSettings getCurrentAccount(String accessToken) {
        return identityAccountClient.getCurrentAccount(accessToken);
    }

    public void changeName(String accessToken, String name) {
        identityAccountClient.changeName(accessToken, name);
    }

    public void changePassword(
            String accessToken,
            String currentPassword,
            String newPassword
    ) {
        identityAccountClient.changePassword(
                accessToken,
                currentPassword,
                newPassword
        );
    }

    public void withdraw(String accessToken, String currentPassword) {
        identityAccountClient.withdraw(accessToken, currentPassword);
    }
}
