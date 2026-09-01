package site.omagotchi.frontend.account.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.account.application.AdminAccountBffService;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminAccountBffControllerTest {

    @Mock
    private AdminAccountBffService service;

    @Mock
    private AccountSessionAuthorization authorization;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        when(authorization.accessToken(any())).thenReturn("admin-token");
        mockMvc = MockMvcBuilders.standaloneSetup(
                new AdminAccountBffController(service, authorization)
        ).build();
    }

    @Test
    @DisplayName("관리자 사용자 검색 조건 전달과 items·page 응답")
    void forwardsSearchConditionsAndReturnsAggregatedPage() throws Exception {
        // Given: 계정과 기수 관리자 정보가 결합된 Application 결과
        UUID accountId = UUID.randomUUID();
        when(service.findAccounts(
                eq("admin-token"),
                eq("kim"),
                eq("ACTIVE"),
                eq("USER"),
                eq(0),
                eq(20),
                eq("NAME_ASC")
        )).thenReturn(new AdminAccountPage(
                List.of(new AdminAccountView(
                        accountId,
                        "user@example.com",
                        "김사용",
                        "USER",
                        "ACTIVE",
                        (short) 2,
                        Instant.parse("2026-08-31T08:00:00Z"),
                        null,
                        Instant.parse("2026-08-31T07:00:00Z"),
                        List.of(new AdminManagedCohort(3L, "AIoT 3기", "MANAGER"))
                )),
                new PageMetadata(0, 20, 1, 1)
        ));

        // When: 검색 조건을 포함한 BFF 사용자 목록 요청
        mockMvc.perform(get("/bff/v1/admin/users")
                        .param("query", "kim")
                        .param("status", "ACTIVE")
                        .param("role", "USER")
                        .param("page", "0")
                        .param("size", "20")
                        .param("sort", "NAME_ASC"))
                // Then: 최소 사용자 정보와 공통 페이지 구조 반환
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.items[0].accountId").value(accountId.toString()),
                        jsonPath("$.items[0].managedCohorts[0].cohortId").value(3),
                        jsonPath("$.items[0].failedLoginAttempts").value(2),
                        jsonPath("$.items[0].lockedUntil").value("2026-08-31T08:00:00Z"),
                        jsonPath("$.items[0].withdrawnAt").doesNotExist(),
                        jsonPath("$.page.number").value(0),
                        jsonPath("$.page.totalElements").value(1)
                );

        verify(service).findAccounts(
                eq("admin-token"),
                eq("kim"),
                eq("ACTIVE"),
                eq("USER"),
                eq(0),
                eq(20),
                eq("NAME_ASC"));
    }

    @Test
    @DisplayName("기수 관리자 지정 요청의 Application Service 위임")
    void assignsManagedCohort() throws Exception {
        // Given: 기수 관리자 지정 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 지정 BFF 요청
        mockMvc.perform(put("/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}",
                        userId, 3L))
                .andExpect(status().isOk());

        // Then: Session Access Token과 식별자를 Application Service에 전달
        verify(service).assignManager(eq("admin-token"), eq(userId), eq(3L));
    }

    @Test
    @DisplayName("기수 관리자 해제 요청의 Application Service 위임")
    void removesManagedCohort() throws Exception {
        // Given: 기수 관리자 해제 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 해제 BFF 요청
        mockMvc.perform(delete("/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}",
                        userId, 3L))
                .andExpect(status().isOk());

        // Then: Session Access Token과 식별자를 Application Service에 전달
        verify(service).removeManager(eq("admin-token"), eq(userId), eq(3L));
    }
}
