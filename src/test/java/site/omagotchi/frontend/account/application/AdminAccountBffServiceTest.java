package site.omagotchi.frontend.account.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import site.omagotchi.frontend.account.application.port.IdentityAdminAccountClient;
import site.omagotchi.frontend.account.application.port.LearningCohortManagerClient;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccount;
import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccountBffServiceTest {

    private static final String ACCESS_TOKEN = "admin-token";

    @Mock
    private IdentityAdminAccountClient identityAccountClient;

    @Mock
    private LearningCohortManagerClient cohortManagerClient;

    private AdminAccountBffService service;

    @BeforeEach
    void setUp() {
        service = new AdminAccountBffService(identityAccountClient, cohortManagerClient);
    }

    @Test
    @DisplayName("Identity 계정 페이지와 Learning 기수 관리자 배정 결합")
    void combinesIdentityAccountPageWithLearningManagerAssignments() {
        // Given: Identity 계정 페이지와 일부 사용자의 기수 관리자 배정
        UUID managerId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(identityAccountClient.findAccounts(
                ACCESS_TOKEN, "kim", "ACTIVE", null, 0, 20, "CREATED_AT_DESC"
        )).thenReturn(page(List.of(
                account(managerId, "manager@example.com"),
                account(userId, "user@example.com")
        )));
        when(cohortManagerClient.findManagedCohorts(
                ACCESS_TOKEN,
                List.of(managerId, userId)
        )).thenReturn(Map.of(
                managerId,
                List.of(new AdminManagedCohort(3L, "AIoT 3기", "MANAGER"))
        ));

        // When: 시스템 관리자 사용자 목록 조회
        AdminAccountPage result = service.findAccounts(
                ACCESS_TOKEN, "kim", "ACTIVE", null, 0, 20, "CREATED_AT_DESC");

        // Then: Identity 페이지 정보를 유지한 화면용 사용자 목록 반환
        assertThat(result.page().totalElements()).isEqualTo(2);
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().getFirst().managedCohorts())
                .singleElement()
                .satisfies(cohort -> {
                    assertThat(cohort.cohortId()).isEqualTo(3L);
                    assertThat(cohort.cohortName()).isEqualTo("AIoT 3기");
                    assertThat(cohort.role()).isEqualTo("MANAGER");
                });
        assertThat(result.items().get(1).managedCohorts()).isEmpty();
    }

    @Test
    @DisplayName("빈 Identity 계정 페이지의 Learning 조회 생략")
    void skipsLearningLookupForEmptyIdentityPage() {
        // Given: 조회 항목이 없는 Identity 계정 페이지
        when(identityAccountClient.findAccounts(
                ACCESS_TOKEN, null, null, null, 3, 20, null
        )).thenReturn(new IdentityAdminAccountPage(
                List.of(),
                new PageMetadata(3, 20, 0, 0)
        ));

        // When: 빈 사용자 페이지 조회
        AdminAccountPage result = service.findAccounts(
                ACCESS_TOKEN, null, null, null, 3, 20, null);

        // Then: 빈 결과를 반환하고 Learning을 호출하지 않음
        assertThat(result.items()).isEmpty();
        verify(cohortManagerClient, never()).findManagedCohorts(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    @DisplayName("기수 관리자 지정의 Learning Port 위임")
    void assignsCohortManagerThroughLearningPort() {
        // Given: 관리자 지정 대상 사용자와 기수
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 지정
        service.assignManager(ACCESS_TOKEN, userId, 3L);

        // Then: Learning Port에 동일한 명령 위임
        verify(cohortManagerClient).assignManager(ACCESS_TOKEN, userId, 3L);
    }

    @Test
    @DisplayName("기수 관리자 해제의 Learning Port 위임")
    void removesCohortManagerThroughLearningPort() {
        // Given: 관리자 해제 대상 사용자와 기수
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 해제
        service.removeManager(ACCESS_TOKEN, userId, 3L);

        // Then: Learning Port에 동일한 명령 위임
        verify(cohortManagerClient).removeManager(ACCESS_TOKEN, userId, 3L);
    }

    private static IdentityAdminAccountPage page(List<IdentityAdminAccount> items) {
        return new IdentityAdminAccountPage(
                items,
                new PageMetadata(0, 20, items.size(), 1)
        );
    }

    private static IdentityAdminAccount account(UUID accountId, String email) {
        return new IdentityAdminAccount(
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
