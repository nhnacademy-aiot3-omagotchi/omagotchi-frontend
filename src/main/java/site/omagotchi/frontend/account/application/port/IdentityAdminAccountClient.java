package site.omagotchi.frontend.account.application.port;

import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;

public interface IdentityAdminAccountClient {

    IdentityAdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            String role,
            Integer page,
            Integer size,
            String sort
    );
}
