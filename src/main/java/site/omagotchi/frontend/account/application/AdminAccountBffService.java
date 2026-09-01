package site.omagotchi.frontend.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.account.application.port.IdentityAdminAccountClient;
import site.omagotchi.frontend.account.application.port.LearningCohortManagerClient;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccount;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Identity 계정 페이지와 Learning 기수 관리자 배정을 결합하는 BFF Use Case. */
@Service
@RequiredArgsConstructor
public class AdminAccountBffService {

    private final IdentityAdminAccountClient identityAccountClient;
    private final LearningCohortManagerClient cohortManagerClient;

    public AdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            String role,
            Integer page,
            Integer size,
            String sort
    ) {
        IdentityAdminAccountPage accounts = identityAccountClient.findAccounts(
                accessToken,
                query,
                status,
                role,
                page,
                size,
                sort
        );

        List<UUID> accountIds = accounts.items().stream()
                .map(IdentityAdminAccount::accountId)
                .toList();
        Map<UUID, List<AdminManagedCohort>> managedCohortsByUser = accountIds.isEmpty()
                ? Map.of()
                : cohortManagerClient.findManagedCohorts(accessToken, accountIds);

        List<AdminAccountView> items = accounts.items().stream()
                .map(account -> toView(
                        account,
                        managedCohortsByUser.getOrDefault(account.accountId(), List.of())))
                .toList();
        return new AdminAccountPage(items, accounts.page());
    }

    public void assignManager(String accessToken, UUID userId, Long cohortId) {
        cohortManagerClient.assignManager(accessToken, userId, cohortId);
    }

    public void removeManager(String accessToken, UUID userId, Long cohortId) {
        cohortManagerClient.removeManager(accessToken, userId, cohortId);
    }

    private static AdminAccountView toView(
            IdentityAdminAccount account,
            List<AdminManagedCohort> managedCohorts
    ) {
        return new AdminAccountView(
                account.accountId(),
                account.email(),
                account.name(),
                account.role(),
                account.status(),
                account.failedLoginAttempts(),
                account.lockedUntil(),
                account.withdrawnAt(),
                account.createdAt(),
                managedCohorts
        );
    }

}
