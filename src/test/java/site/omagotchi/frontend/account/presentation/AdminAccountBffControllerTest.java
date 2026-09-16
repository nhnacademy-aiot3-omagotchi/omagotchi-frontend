package site.omagotchi.frontend.account.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.account.application.AdminAccountBffService;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;

@WebMvcTest(AdminAccountBffController.class)
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
@Import(AccountSessionAuthorization.class)
class AdminAccountBffControllerTest extends FrontendMvcTestSupport {

    @MockitoBean
    private AdminAccountBffService service;

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {}

    @Override
    protected MockHttpSession authenticatedSession() {
        Instant now = Instant.parse("2030-01-01T00:00:00Z");
        return authenticatedSession(
                new BrowserSessionTokenBundle(
                        UUID.fromString("00000000-0000-0000-0000-000000000001"),
                        GlobalRole.SYSTEM_ADMIN,
                        "admin-token",
                        now.plusSeconds(3600),
                        "admin-refresh-token",
                        now.plusSeconds(86400)));
    }

    @Test
    @DisplayName("관리자 사용자 검색 조건 전달과 items·page 응답")
    void forwardsSearchConditionsAndReturnsAggregatedPage() throws Exception {
        // Given: 계정과 기수 관리자 정보가 결합된 Application 결과
        UUID accountId = UUID.randomUUID();
        when(service.findAccounts(
                "admin-token",
                "kim",
                "ACTIVE",
                true,
                "USER",
                0,
                20,
                "NAME_ASC"
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
                        .session(authenticatedSession())
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
                        jsonPath("$.page.totalElements").value(1))
                .andDo(document(
                        "admin-account/list",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        queryParameters(
                                parameterWithName("query").description("이메일·이름 검색어"),
                                parameterWithName("status").description("계정 상태 필터"),
                                parameterWithName("locked").description("로그인 잠금 여부 필터"),
                                parameterWithName("role").description("전역 역할 필터"),
                                parameterWithName("page").description("페이지 번호(0부터 시작)"),
                                parameterWithName("size").description("페이지 크기"),
                                parameterWithName("sort").description("정렬 기준")),
                        responseFields(
                                fieldWithPath("items").description("관리자 계정 목록"),
                                fieldWithPath("items[].accountId").description("계정 ID"),
                                fieldWithPath("items[].email").description("이메일"),
                                fieldWithPath("items[].name").description("이름"),
                                fieldWithPath("items[].role").description("전역 역할"),
                                fieldWithPath("items[].status").description("계정 상태"),
                                fieldWithPath("items[].failedLoginAttempts")
                                        .description("실패한 로그인 횟수"),
                                fieldWithPath("items[].locked").description("로그인 잠금 여부"),
                                fieldWithPath("items[].lockedUntil")
                                        .description("잠금 해제 시각")
                                        .optional(),
                                fieldWithPath("items[].statusChangedAt")
                                        .description("상태 변경 시각")
                                        .optional(),
                                fieldWithPath("items[].recoveryDeadline")
                                        .description("복구 기한")
                                        .optional(),
                                fieldWithPath("items[].createdAt").description("계정 생성 시각"),
                                fieldWithPath("items[].managedCohorts")
                                        .description("관리 중인 기수 목록"),
                                fieldWithPath("items[].managedCohorts[].cohortId")
                                        .description("기수 ID"),
                                fieldWithPath("items[].managedCohorts[].cohortName")
                                        .description("기수 이름"),
                                fieldWithPath("items[].managedCohorts[].role")
                                        .description("기수 내 역할"),
                                fieldWithPath("page.number").description("현재 페이지 번호"),
                                fieldWithPath("page.size").description("페이지 크기"),
                                fieldWithPath("page.totalElements").description("전체 항목 수"),
                                fieldWithPath("page.totalPages").description("전체 페이지 수"))));

        verify(service).findAccounts(
                "admin-token",
                "kim",
                "ACTIVE",
                true,
                "USER",
                0,
                20,
                "NAME_ASC");
    }

    @Test
    @DisplayName("계정 상태 변경 요청의 Application Service 위임")
    void changesAccountStatus() throws Exception {
        // Given: 비활성화 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 계정 상태 변경 BFF 요청
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/status", userId)
                        .with(csrf())
                        .session(authenticatedSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {"status": "DISABLED", "reason": "부정 사용 신고"}
                        """))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "admin-account/change-status",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("user-id").description("상태를 변경할 사용자 ID")),
                        requestFields(
                                fieldWithPath("status")
                                        .description("목표 상태(ACTIVE 또는 DISABLED)"),
                                fieldWithPath("reason").description("상태 변경 사유"))));

        // Then: Session Access Token과 요청 값을 Application Service에 전달
        verify(service).changeAccountStatus("admin-token", userId, "DISABLED", "부정 사용 신고");
    }

    @Test
    @DisplayName("로그인 잠금 해제 요청의 Application Service 위임")
    void unlocksLogin() throws Exception {
        UUID userId = UUID.randomUUID();
        String reason = "가".repeat(500);

        mockMvc.perform(post("/bff/v1/admin/users/{user-id}/login-lock/unlock", userId)
                        .with(csrf())
                        .session(authenticatedSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + reason + "\"}"))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "admin-account/unlock-login",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("user-id").description("잠금을 해제할 사용자 ID")),
                        requestFields(fieldWithPath("reason").description("잠금 해제 사유"))));

        // Then: 검증을 통과한 최대 길이 사유를 그대로 위임
        verify(service).unlockLogin("admin-token", userId, reason);
    }

    @Test
    @DisplayName("공백 사유의 로그인 잠금 해제 요청 거부")
    void rejectsLoginUnlockWithoutReason() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(post("/bff/v1/admin/users/{user-id}/login-lock/unlock", userId)
                        .with(csrf())
                        .session(authenticatedSession())
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
                        .with(csrf())
                        .session(authenticatedSession())
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
                        .with(csrf())
                        .session(authenticatedSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {"role": "SYSTEM_ADMIN", "reason": "운영 인수인계"}
                        """))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "admin-account/change-role",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("user-id").description("역할을 변경할 사용자 ID")),
                        requestFields(
                                fieldWithPath("role")
                                        .description("목표 전역 역할(USER 또는 SYSTEM_ADMIN)"),
                                fieldWithPath("reason").description("역할 변경 사유"))));

        // Then: Session Access Token과 요청 값을 Application Service에 전달
        verify(service).changeAccountRole("admin-token", userId, "SYSTEM_ADMIN", "운영 인수인계");
    }

    @Test
    @DisplayName("Identity가 받지 않는 역할 값의 요청 단계 거부")
    void rejectsUnsupportedGlobalRole() throws Exception {
        // Given: 전역 역할이 아닌 기수 관리자 값
        UUID userId = UUID.randomUUID();

        // When & Then: Identity에 닿기 전에 400으로 끊는다
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/role", userId)
                        .with(csrf())
                        .session(authenticatedSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {"role": "COHORT_MANAGER", "reason": "기수 배정"}
                        """))
                .andExpect(status().isBadRequest());

        verify(service, never()).changeAccountRole(anyString(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("사유 없는 역할 변경 요청의 거부")
    void rejectsRoleChangeWithoutReason() throws Exception {
        // Given: 사유가 비어 있는 요청
        UUID userId = UUID.randomUUID();

        // When & Then: 감사 기록에 남길 사유가 없으므로 400으로 끊는다
        mockMvc.perform(patch("/bff/v1/admin/users/{user-id}/role", userId)
                        .with(csrf())
                        .session(authenticatedSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                        {"role": "SYSTEM_ADMIN", "reason": "   "}
                        """))
                .andExpect(status().isBadRequest());

        verify(service, never()).changeAccountRole(anyString(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("기수 관리자 지정 요청의 Application Service 위임")
    void assignsManagedCohort() throws Exception {
        // Given: 기수 관리자 지정 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 지정 BFF 요청
        mockMvc.perform(put("/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}", userId, 3L)
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "admin-account/assign-managed-cohort",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(
                                parameterWithName("user-id").description("기수를 지정할 사용자 ID"),
                                parameterWithName("cohort-id").description("지정할 기수 ID"))));

        // Then: Session Access Token과 식별자를 Application Service에 전달
        verify(service).assignManager("admin-token", userId, 3L);
    }

    @Test
    @DisplayName("기수 관리자 해제 요청의 Application Service 위임")
    void removesManagedCohort() throws Exception {
        // Given: 기수 관리자 해제 대상 사용자
        UUID userId = UUID.randomUUID();

        // When: 기수 관리자 해제 BFF 요청
        mockMvc.perform(delete(
                                "/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}",
                                userId,
                                3L)
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "admin-account/remove-managed-cohort",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(
                                parameterWithName("user-id")
                                        .description("기수 지정을 해제할 사용자 ID"),
                                parameterWithName("cohort-id").description("해제할 기수 ID"))));

        // Then: Session Access Token과 식별자를 Application Service에 전달
        verify(service).removeManager("admin-token", userId, 3L);
    }
}
