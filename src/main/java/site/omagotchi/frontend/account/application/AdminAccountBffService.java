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

/** Identity 계정 페이지와 Learning 기수 관리자 배정을 결합하는 BFF 유스케이스. */
@Service
@RequiredArgsConstructor
public class AdminAccountBffService {

    private final IdentityAdminAccountClient identityAccountClient;
    private final LearningCohortManagerClient cohortManagerClient;

    public AdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            Boolean locked,
            String role,
            Integer page,
            Integer size,
            String sort
    ) {
        IdentityAdminAccountPage accounts = identityAccountClient.findAccounts(
                accessToken,
                query,
                status,
                locked,
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
                .map(account -> AdminAccountView.from(
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

    /**
     * 계정 상태를 변경한다.
     *
     * <p>Identity 단독 작업이라 Learning 합성이 없다. 같은 상태로의 요청은 Identity가
     * 조용히 무시하므로 여기서 미리 걸러내지 않는다.</p>
     */
    public void changeAccountStatus(
            String accessToken,
            UUID userId,
            String status,
            String reason
    ) {
        identityAccountClient.changeStatus(accessToken, userId, status, reason);
    }

    /**
     * 전역 역할을 변경한다.
     *
     * <p>기수 관리자 배정은 Learning 쪽 경로라 여기서 함께 처리하지 않는다. 두 저장소에
     * 걸친 원자적 갱신을 흉내 내면 한쪽만 성공한 상태를 감추게 된다.</p>
     */
    public void changeAccountRole(
            String accessToken,
            UUID userId,
            String role,
            String reason
    ) {
        identityAccountClient.changeRole(accessToken, userId, role, reason);
    }

    public void unlockLogin(String accessToken, UUID userId, String reason) {
        identityAccountClient.unlockLogin(accessToken, userId, reason);
    }
}
