package site.omagotchi.frontend.account.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
        lenient().when(authorization.accessToken(any())).thenReturn("admin-token");
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
                eq(true),
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
                        true,
                        Instant.parse("2026-08-31T08:00:00Z"),
                        Instant.parse("2026-08-31T07:30:00Z"),
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
                        .param("locked", "true")
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
                        jsonPath("$.items[0].locked").value(true),
                        jsonPath("$.items[0].lockedUntil").value("2026-08-31T08:00:00Z"),
                        jsonPath("$.items[0].statusChangedAt").value("2026-08-31T07:30:00Z"),
                        jsonPath("$.page.number").value(0),
                        jsonPath("$.page.totalElements").value(1)
                );

        verify(service).findAccounts(
                eq("admin-token"),
                eq("kim"),
                eq("ACTIVE"),
                eq(true),
                eq("USER"),
                eq(0),
                eq(20),
                eq("NAME_ASC"));
    }

    @Test
    @DisplayName("계정 상태 변경 요청의 Application Service 위임")
    void changesAccountStatus() throws Exception {
        // Given: 비활성화 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 계정 상태 변경 BFF 요청
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/status", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "DISABLED", "reason": "부정 사용 신고"}
                                """))
                .andExpect(status().isNoContent());

        // Then: Session Access Token과 요청 값을 Application Service에 전달
        verify(service).changeAccountStatus(
                eq("admin-token"), eq(userId), eq("DISABLED"), eq("부정 사용 신고"));
    }

    @Test
    @DisplayName("로그인 잠금 해제 요청의 Application Service 위임")
    void unlocksLogin() throws Exception {
        UUID userId = UUID.randomUUID();
        String reason = "가".repeat(500);

        mockMvc.perform(post("/bff/v1/admin/users/{user-id}/login-lock/unlock", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + reason + "\"}"))
                .andExpect(status().isNoContent());

        // Then: 검증을 통과한 최대 길이 사유를 그대로 위임
        verify(service).unlockLogin("admin-token", userId, reason);
    }

    @Test
    @DisplayName("공백 사유의 로그인 잠금 해제 요청 거부")
    void rejectsLoginUnlockWithoutReason() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(post("/bff/v1/admin/users/{user-id}/login-lock/unlock", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        verify(service, never()).unlockLogin(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("최대 길이를 초과한 로그인 잠금 해제 사유 거부")
    void rejectsTooLongLoginUnlockReason() throws Exception {
        UUID userId = UUID.randomUUID();
        String reason = "가".repeat(501);

        mockMvc.perform(post("/bff/v1/admin/users/{user-id}/login-lock/unlock", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + reason + "\"}"))
                .andExpect(status().isBadRequest());

        verify(service, never()).unlockLogin(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("전역 역할 변경 요청의 Application Service 위임")
    void changesAccountRole() throws Exception {
        // Given: 관리자 권한 부여 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 전역 역할 변경 BFF 요청
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/role", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "SYSTEM_ADMIN", "reason": "운영 인수인계"}
                                """))
                .andExpect(status().isNoContent());

        // Then: Session Access Token과 요청 값을 Application Service에 전달
        verify(service).changeAccountRole(
                eq("admin-token"), eq(userId), eq("SYSTEM_ADMIN"), eq("운영 인수인계"));
    }

    @Test
    @DisplayName("Identity가 받지 않는 역할 값의 요청 단계 거부")
    void rejectsUnsupportedGlobalRole() throws Exception {
        // Given: 전역 역할이 아닌 기수 관리자 값
        UUID userId = UUID.randomUUID();

        // When & Then: Identity에 닿기 전에 400으로 끊는다
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/role", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "COHORT_MANAGER", "reason": "기수 배정"}
                                """))
                .andExpect(status().isBadRequest());

        verify(service, never()).changeAccountRole(
                anyString(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("사유 없는 역할 변경 요청의 거부")
    void rejectsRoleChangeWithoutReason() throws Exception {
        // Given: 사유가 비어 있는 요청
        UUID userId = UUID.randomUUID();

        // When & Then: 감사 기록에 남길 사유가 없으므로 400으로 끊는다
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/role", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "SYSTEM_ADMIN", "reason": "   "}
                                """))
                .andExpect(status().isBadRequest());

        verify(service, never()).changeAccountRole(
                anyString(), any(), anyString(), anyString());
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
