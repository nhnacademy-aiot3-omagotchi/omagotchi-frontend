package site.omagotchi.frontend.account.application.port;

import site.omagotchi.frontend.account.application.result.AccountSettings;

public interface IdentityAccountClient {

    AccountSettings getCurrentAccount(String accessToken);

    void changeName(String accessToken, String name);

    void changePassword(
            String accessToken,
            String currentPassword,
            String newPassword
    );
}
