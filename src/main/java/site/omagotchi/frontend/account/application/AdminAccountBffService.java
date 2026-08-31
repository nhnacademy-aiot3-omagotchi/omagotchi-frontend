package site.omagotchi.frontend.account.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.account.infrastructure.AdminAccountGatewayHttpService;
import site.omagotchi.frontend.account.infrastructure.request.GatewayCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.response.GatewayAdminAccountPageResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayAdminAccountResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayManagedCohortResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayUserManagedCohortsResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Identity 계정 페이지와 Learning 기수 관리자 배정을 결합하는 BFF Use Case. */
@Service
@RequiredArgsConstructor
public class AdminAccountBffService {

    private final AdminAccountGatewayHttpService gatewayHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public AdminAccountPage findAccounts(
            HttpServletRequest request,
            String query,
            String status,
            String role,
            Integer page,
            Integer size,
            String sort
    ) {
        String bearerToken = authorization.bearerToken(request);
        GatewayAdminAccountPageResponse accounts = callExecutor.execute(
                () -> gatewayHttpService.getUsers(
                        bearerToken, query, status, role, page, size, sort)
        );
        requireValidPage(accounts);

        List<UUID> accountIds = accounts.content().stream()
                .map(GatewayAdminAccountResponse::accountId)
                .toList();
        Map<UUID, GatewayUserManagedCohortsResponse> managedCohortsByUser = accountIds.isEmpty()
                ? Map.of()
                : managedCohortsByUser(bearerToken, accountIds);

        List<AdminAccountView> content = accounts.content().stream()
                .map(account -> toView(account, managedCohortsByUser.get(account.accountId())))
                .toList();
        return new AdminAccountPage(
                content,
                accounts.page(),
                accounts.size(),
                accounts.totalElements(),
                accounts.totalPages()
        );
    }

    public void assignManager(
            HttpServletRequest request,
            UUID userId,
            Long cohortId
    ) {
        callExecutor.execute(() -> gatewayHttpService.assignManager(
                authorization.bearerToken(request),
                cohortId,
                new GatewayAssignCohortManagerRequest(userId)
        ));
    }

    public void removeManager(
            HttpServletRequest request,
            UUID userId,
            Long cohortId
    ) {
        callExecutor.execute(() -> gatewayHttpService.changeMemberRole(
                authorization.bearerToken(request),
                cohortId,
                userId,
                new GatewayChangeCohortMemberRoleRequest("STUDENT")
        ));
    }

    private Map<UUID, GatewayUserManagedCohortsResponse> managedCohortsByUser(
            String bearerToken,
            List<UUID> accountIds
    ) {
        List<GatewayUserManagedCohortsResponse> assignments = callExecutor.execute(
                () -> gatewayHttpService.searchManagedCohorts(
                        bearerToken,
                        new GatewayCohortManagerSearchRequest(accountIds)
                )
        );
        if (assignments == null
                || assignments.stream().anyMatch(item -> item == null
                        || item.userId() == null
                        || item.cohorts() == null)) {
            throw invalidResponse("Learning 기수 관리자 응답 누락");
        }
        try {
            return assignments.stream().collect(Collectors.toUnmodifiableMap(
                    GatewayUserManagedCohortsResponse::userId,
                    Function.identity()
            ));
        } catch (IllegalStateException duplicateUser) {
            throw invalidResponse("Learning 기수 관리자 사용자 중복", duplicateUser);
        }
    }

    private static AdminAccountView toView(
            GatewayAdminAccountResponse account,
            GatewayUserManagedCohortsResponse assignments
    ) {
        List<AdminManagedCohort> managedCohorts = assignments == null
                ? List.of()
                : assignments.cohorts().stream().map(AdminAccountBffService::toView).toList();
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

    private static AdminManagedCohort toView(GatewayManagedCohortResponse cohort) {
        if (cohort == null || cohort.cohortId() == null || cohort.cohortName() == null
                || cohort.role() == null) {
            throw invalidResponse("Learning 기수 관리자 상세 응답 누락");
        }
        return new AdminManagedCohort(cohort.cohortId(), cohort.cohortName(), cohort.role());
    }

    private static void requireValidPage(GatewayAdminAccountPageResponse accounts) {
        if (accounts == null
                || accounts.content() == null
                || accounts.page() < 0
                || accounts.size() < 1
                || accounts.totalElements() < 0
                || accounts.totalPages() < 0
                || accounts.content().stream().anyMatch(AdminAccountBffService::isInvalidAccount)) {
            throw invalidResponse("Identity 관리자 계정 페이지 응답 누락");
        }
    }

    private static boolean isInvalidAccount(GatewayAdminAccountResponse account) {
        return account == null
                || account.accountId() == null
                || account.email() == null
                || account.name() == null
                || account.role() == null
                || account.status() == null
                || account.createdAt() == null;
    }

    private static BusinessException invalidResponse(String diagnostic) {
        return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, diagnostic);
    }

    private static BusinessException invalidResponse(String diagnostic, Throwable cause) {
        return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, diagnostic, cause);
    }
}
