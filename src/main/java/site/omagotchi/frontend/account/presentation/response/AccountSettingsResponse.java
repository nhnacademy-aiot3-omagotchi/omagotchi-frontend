package site.omagotchi.frontend.account.presentation.response;

import site.omagotchi.frontend.account.application.result.AccountSettings;

public record AccountSettingsResponse(
        String email,
        String name
) {

    public static AccountSettingsResponse from(AccountSettings accountSettings) {
        return new AccountSettingsResponse(
                accountSettings.email(),
                accountSettings.name()
        );
    }
}
