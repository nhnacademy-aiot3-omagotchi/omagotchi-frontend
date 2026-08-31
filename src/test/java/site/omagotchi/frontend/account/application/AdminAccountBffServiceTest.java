package site.omagotchi.frontend.account.application;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import site.omagotchi.frontend.account.infrastructure.AdminAccountGatewayHttpService;
import site.omagotchi.frontend.account.infrastructure.request.GatewayCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.response.GatewayAdminAccountPageResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayAdminAccountResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayManagedCohortResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayUserManagedCohortsResponse;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccountBffServiceTest {

    private static final String BEARER = "Bearer admin-token";

    @Mock
    private AdminAccountGatewayHttpService gatewayHttpService;

    @Mock
    private LearningSessionAuthorization authorization;

    @Mock
    private ApiErrorResponseDecoder errorResponseDecoder;

    @Mock
    private HttpServletRequest request;

    private AdminAccountBffService service;

    @BeforeEach
    void setUp() {
        service = new AdminAccountBffService(
                gatewayHttpService,
                new LearningGatewayCallExecutor(errorResponseDecoder),
                authorization
        );
        when(authorization.bearerToken(request)).thenReturn(BEARER);
    }

    @Test
    void combinesIdentityAccountPageWithLearningManagerAssignments() {
        UUID managerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(gatewayHttpService.getUsers(
                BEARER, "kim", "ACTIVE", null, 0, 20, "CREATED_AT_DESC"
        )).thenReturn(new GatewayAdminAccountPageResponse(
                List.of(account(managerId, "manager@example.com"), account(userId, "user@example.com")),
                0,
                20,
                2,
                1
        ));
        when(gatewayHttpService.searchManagedCohorts(
                BEARER,
                new GatewayCohortManagerSearchRequest(List.of(managerId, userId))
        )).thenReturn(List.of(new GatewayUserManagedCohortsResponse(
                managerId,
                List.of(new GatewayManagedCohortResponse(3L, "AIoT 3기", "MANAGER"))
        )));

        var result = service.findAccounts(
                request, "kim", "ACTIVE", null, 0, 20, "CREATED_AT_DESC");

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.content()).hasSize(2);
        assertThat(result.content().getFirst().managedCohorts())
                .singleElement()
                .satisfies(cohort -> {
                    assertThat(cohort.cohortId()).isEqualTo(3L);
                    assertThat(cohort.cohortName()).isEqualTo("AIoT 3기");
                    assertThat(cohort.role()).isEqualTo("MANAGER");
                });
        assertThat(result.content().get(1).managedCohorts()).isEmpty();
    }

    @Test
    void skipsLearningLookupForEmptyIdentityPage() {
        when(gatewayHttpService.getUsers(BEARER, null, null, null, 3, 20, null))
                .thenReturn(new GatewayAdminAccountPageResponse(List.of(), 3, 20, 0, 0));

        var result = service.findAccounts(request, null, null, null, 3, 20, null);

        assertThat(result.content()).isEmpty();
        verify(gatewayHttpService, never()).searchManagedCohorts(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void assignsAndRemovesCohortManagerThroughGateway() {
        UUID userId = UUID.randomUUID();

        service.assignManager(request, userId, 3L);
        service.removeManager(request, userId, 3L);

        verify(gatewayHttpService).assignManager(
                BEARER, 3L, new GatewayAssignCohortManagerRequest(userId));
        verify(gatewayHttpService).changeMemberRole(
                BEARER, 3L, userId, new GatewayChangeCohortMemberRoleRequest("STUDENT"));
    }

    private static GatewayAdminAccountResponse account(UUID accountId, String email) {
        return new GatewayAdminAccountResponse(
                accountId,
                email,
                "사용자",
                "USER",
                "ACTIVE",
                (short) 0,
                null,
                null,
                Instant.parse("2026-08-31T07:00:00Z")
        );
    }
}
