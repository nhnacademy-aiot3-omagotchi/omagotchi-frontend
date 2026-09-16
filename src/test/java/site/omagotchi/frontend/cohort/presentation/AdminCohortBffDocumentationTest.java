package site.omagotchi.frontend.cohort.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.restdocs.operation.preprocess.OperationRequestPreprocessor;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.request.ParameterDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest(AdminCohortBffController.class)
@Import({ManagerJoinCodeSessionStore.class})
class AdminCohortBffDocumentationTest extends FrontendRestDocsTestSupport {

    private static final Cookie SESSION_COOKIE = new Cookie("SESSION", "session-placeholder");
    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final long COHORT_ID = 7L;
    private static final long MEMBERSHIP_ID = 101L;
    private final JsonMapper mapper = JsonMapper.builder().build();

    @MockitoBean
    private LearningProxyBffService proxy;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("기수 목록 조회")
    void documentsListCohorts() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                [{"id":7,"name":"AIoT 3기","description":"Backend","startDate":"2026-08-01",
                  "endDate":"2026-11-30","status":"ACTIVE","memberCount":12,
                  "managerUserIds":["00000000-0000-0000-0000-000000000001"]}]
                """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts")
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].id").value(7),
                        jsonPath("$[0].name").value("AIoT 3기"),
                        jsonPath("$[0].status").value("ACTIVE"),
                        jsonPath("$[0].memberCount").value(12),
                        jsonPath("$[0].managerUserIds[0]").value(USER_ID.toString()))
                .andDo(document("admin-cohorts/list", pp(), responseFields(cohortSummaryFields())));
    }

    @Test
    @DisplayName("기수 생성")
    void documentsCreateCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                {"id":7,"name":"AIoT 3기","description":"Backend","startDate":"2026-08-01",
                 "endDate":"2026-11-30","status":"PREPARING",
                 "createdByUserId":"00000000-0000-0000-0000-000000000002",
                 "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-08-01T00:00:00Z"}
                """));

        // When & Then
        mockMvc.perform(post("/bff/v1/admin/cohorts")
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content(
                                """
                        {"name":"AIoT 3기","description":"Backend",
                         "startDate":"2026-08-01","endDate":"2026-11-30"}
                        """))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(7),
                        jsonPath("$.status").value("PREPARING"),
                        jsonPath("$.createdByUserId").value("00000000-0000-0000-0000-000000000002"))
                .andDo(document(
                        "admin-cohorts/create",
                        pp(),
                        requestFields(cohortRequestFields()),
                        responseFields(cohortDetailFields())));
    }

    @Test
    @DisplayName("기수 수정")
    void documentsUpdateCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                {"id":7,"name":"AIoT 3기","description":"Backend updated","startDate":"2026-08-01",
                 "endDate":"2026-12-31","status":"PREPARING",
                 "createdByUserId":"00000000-0000-0000-0000-000000000002",
                 "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-09-14T00:00:00Z"}
                """));

        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/cohorts/{cohort-id}", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content(
                                """
                        {"name":"AIoT 3기","description":"Backend updated",
                         "startDate":"2026-08-01","endDate":"2026-12-31"}
                        """))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(7),
                        jsonPath("$.description").value("Backend updated"),
                        jsonPath("$.endDate").value("2026-12-31"),
                        jsonPath("$.updatedAt").value("2026-09-14T00:00:00Z"))
                .andDo(document(
                        "admin-cohorts/update",
                        pp(),
                        pathParameters(cohortId()),
                        requestFields(cohortRequestFields()),
                        responseFields(cohortDetailFields())));
    }

    @Test
    @DisplayName("기수 상태 변경")
    void documentsChangeCohortStatus() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                {"id":7,"name":"AIoT 3기","description":"Backend","startDate":"2026-08-01",
                 "endDate":"2026-11-30","status":"ACTIVE",
                 "createdByUserId":"00000000-0000-0000-0000-000000000002",
                 "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-09-14T00:00:00Z"}
                """));

        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/cohorts/{cohort-id}/status", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(7),
                        jsonPath("$.status").value("ACTIVE"),
                        jsonPath("$.createdAt").value("2026-08-01T00:00:00Z"))
                .andDo(document(
                        "admin-cohorts/update-status",
                        pp(),
                        pathParameters(cohortId()),
                        requestFields(fieldWithPath("status").description("목표 기수 상태")),
                        responseFields(cohortDetailFields())));
    }

    @Test
    @DisplayName("기수 삭제")
    void documentsDeleteCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any())).thenReturn(null);

        // When & Then
        mockMvc.perform(delete("/bff/v1/admin/cohorts/{cohort-id}", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document("admin-cohorts/delete", pp(), pathParameters(cohortId())));
    }

    @Test
    @DisplayName("기수 멤버 조회")
    void documentsListMembers() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                [{"id":101,"cohortId":7,"userId":"00000000-0000-0000-0000-000000000001",
                  "role":"MANAGER","status":"ACTIVE","requestedAt":"2026-08-01T01:00:00Z",
                  "processedAt":"2026-08-01T02:00:00Z","processedByUserId":"00000000-0000-0000-0000-000000000002",
                  "rejectionReason":null,"endedAt":null,"nickname":"오마"}]
                """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/members", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].id").value(101),
                        jsonPath("$[0].cohortId").value(7),
                        jsonPath("$[0].userId").value(USER_ID.toString()),
                        jsonPath("$[0].role").value("MANAGER"),
                        jsonPath("$[0].nickname").value("오마"))
                .andDo(document(
                        "admin-cohorts/members",
                        pp(),
                        pathParameters(cohortId()),
                        responseFields(membershipFields("[]"))));
    }

    @Test
    @DisplayName("기수 가입 신청 조회")
    void documentsListApplications() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                """
                [{"id":101,"cohortId":7,"userId":"00000000-0000-0000-0000-000000000001",
                  "role":"STUDENT","status":"PENDING","requestedAt":"2026-09-14T01:00:00Z",
                  "processedAt":null,"processedByUserId":null,"rejectionReason":null,"endedAt":null,
                  "nickname":"오마"}]
                """));

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/applications", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].id").value(101),
                        jsonPath("$[0].status").value("PENDING"),
                        jsonPath("$[0].requestedAt").value("2026-09-14T01:00:00Z"))
                .andDo(document(
                        "admin-cohorts/applications",
                        pp(),
                        pathParameters(cohortId()),
                        responseFields(membershipFields("[]"))));
    }

    @Test
    @DisplayName("관리자 추가")
    void documentsAddManager() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any())).thenReturn(json(membershipResponse("MANAGER", "ACTIVE")));

        // When & Then
        mockMvc.perform(post("/bff/v1/admin/cohorts/{cohort-id}/managers", COHORT_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"userId\":\"00000000-0000-0000-0000-000000000001\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(101),
                        jsonPath("$.role").value("MANAGER"),
                        jsonPath("$.status").value("ACTIVE"))
                .andDo(document(
                        "admin-cohorts/add-manager",
                        pp(),
                        pathParameters(cohortId()),
                        requestFields(fieldWithPath("userId").description("관리자로 지정할 사용자 ID")),
                        responseFields(membershipFields(""))));
    }

    @Test
    @DisplayName("멤버 역할 수정")
    void documentsUpdateMemberRole() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any())).thenReturn(json(membershipResponse("MANAGER", "ACTIVE")));

        // When & Then
        mockMvc.perform(patch(
                                "/bff/v1/admin/cohorts/{cohort-id}/members/{member-user-id}/role",
                                COHORT_ID,
                                USER_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"role\":\"MANAGER\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.userId").value(USER_ID.toString()),
                        jsonPath("$.role").value("MANAGER"))
                .andDo(document(
                        "admin-cohorts/update-member-role",
                        pp(),
                        pathParameters(
                                cohortId(),
                                parameterWithName("member-user-id")
                                        .description("회원 사용자 ID")),
                        requestFields(fieldWithPath("role").description("기수 내 역할")),
                        responseFields(membershipFields(""))));
    }

    @Test
    @DisplayName("가입 승인")
    void documentsApproveMembership() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any())).thenReturn(json(membershipResponse("STUDENT", "ACTIVE")));

        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/memberships/{membership-id}/approve", MEMBERSHIP_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"role\":\"STUDENT\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(101),
                        jsonPath("$.status").value("ACTIVE"),
                        jsonPath("$.role").value("STUDENT"))
                .andDo(document(
                        "admin-cohorts/approve-membership",
                        pp(),
                        pathParameters(parameterWithName("membership-id").description("승인할 소속 신청 ID")),
                        requestFields(fieldWithPath("role").description("승인 후 부여할 기수 역할")),
                        responseFields(membershipFields(""))));
    }

    @Test
    @DisplayName("가입 거부")
    void documentsRejectMembership() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any())).thenReturn(json(membershipResponseWithReason()));

        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/memberships/{membership-id}/reject", MEMBERSHIP_ID)
                        .cookie(SESSION_COOKIE)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"reason\":\"정원 초과\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(101),
                        jsonPath("$.status").value("REJECTED"),
                        jsonPath("$.rejectionReason").value("정원 초과"))
                .andDo(document(
                        "admin-cohorts/reject-membership",
                        pp(),
                        pathParameters(parameterWithName("membership-id").description("거절할 소속 신청 ID")),
                        requestFields(fieldWithPath("reason").description("거절 사유")),
                        responseFields(membershipFields(""))));
    }

    @Test
    @DisplayName("가입 코드 조회")
    void documentsGetJoinCodeAndRestoresIssuedCodeFromSession() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                "{\"cohortId\":7,\"code\":\"ABCD1234\",\"status\":\"ACTIVE\",\"expiresAt\":\"2099-12-31T00:00:00Z\",\"issuedAt\":\"2026-09-14T00:00:00Z\"}"),
                        json(
                                "{\"cohortId\":7,\"status\":\"ACTIVE\",\"expiresAt\":\"2099-12-31T00:00:00Z\",\"issuedAt\":\"2026-09-14T00:00:00Z\",\"revokedAt\":null}"));
        MockHttpSession session = authenticatedSession();

        // When & Then
        mockMvc.perform(post("/bff/v1/admin/cohorts/{cohort-id}/join-code", COHORT_ID)
                        .session(session)
                        .cookie(SESSION_COOKIE)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"expiresAt\":\"2099-12-31T00:00:00Z\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/join-code", COHORT_ID)
                        .session(session)
                        .cookie(SESSION_COOKIE))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.cohortId").value(7),
                        jsonPath("$.status").value("ACTIVE"),
                        jsonPath("$.code").value("ABCD1234"))
                .andDo(document(
                        "admin-cohorts/get-join-code",
                        pp(),
                        pathParameters(cohortId()),
                        responseFields(joinCodeMetadataFields(true))));
    }

    @Test
    @DisplayName("가입 코드 생성")
    void documentsCreateJoinCode() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                "{\"cohortId\":7,\"code\":\"ABCD1234\",\"status\":\"ACTIVE\",\"expiresAt\":\"2099-12-31T00:00:00Z\",\"issuedAt\":\"2026-09-14T00:00:00Z\"}"));

        // When & Then
        mockMvc.perform(post("/bff/v1/admin/cohorts/{cohort-id}/join-code", COHORT_ID)
                        .session(authenticatedSession())
                        .cookie(SESSION_COOKIE)
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"expiresAt\":\"2099-12-31T00:00:00Z\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.cohortId").value(7),
                        jsonPath("$.code").value("ABCD1234"),
                        jsonPath("$.status").value("ACTIVE"))
                .andDo(document(
                        "admin-cohorts/create-join-code",
                        pp(),
                        pathParameters(cohortId()),
                        requestFields(fieldWithPath("expiresAt").description("가입 코드 만료 시각")),
                        responseFields(issuedJoinCodeFields())));
    }

    @Test
    @DisplayName("가입 코드 폐기")
    void documentsRevokeJoinCode() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(proxy.execute(any(), any()))
                .thenReturn(
                        json(
                                "{\"cohortId\":7,\"status\":\"REVOKED\",\"expiresAt\":\"2099-12-31T00:00:00Z\",\"issuedAt\":\"2026-09-14T00:00:00Z\",\"revokedAt\":\"2026-09-14T01:00:00Z\"}"));

        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/cohorts/{cohort-id}/join-code/revoke", COHORT_ID)
                        .session(authenticatedSession())
                        .cookie(SESSION_COOKIE)
                        .with(csrf()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.cohortId").value(7),
                        jsonPath("$.status").value("REVOKED"),
                        jsonPath("$.revokedAt").value("2026-09-14T01:00:00Z"))
                .andDo(document(
                        "admin-cohorts/revoke-join-code",
                        pp(),
                        pathParameters(cohortId()),
                        responseFields(joinCodeMetadataFields(false))));
    }

    private JsonNode json(String value) throws Exception {
        return mapper.readTree(value);
    }

    private static OperationRequestPreprocessor
            pp() {
        return preprocessRequest(prettyPrint());
    }

    private static ParameterDescriptor cohortId() {
        return parameterWithName("cohort-id").description("기수 ID");
    }

    private static FieldDescriptor[] cohortRequestFields() {
        return new FieldDescriptor[] {
            fieldWithPath("name").description("기수 이름"),
            fieldWithPath("description").optional().description("기수 설명"),
            fieldWithPath("startDate").description("시작일"),
            fieldWithPath("endDate").description("종료일")
        };
    }

    private static FieldDescriptor[] cohortSummaryFields() {
        return new FieldDescriptor[] {
            fieldWithPath("[].id").description("기수 ID"),
            fieldWithPath("[].name").description("기수 이름"),
            fieldWithPath("[].description").description("기수 설명"),
            fieldWithPath("[].startDate").description("시작일"),
            fieldWithPath("[].endDate").description("종료일"),
            fieldWithPath("[].status").description("기수 상태"),
            fieldWithPath("[].memberCount").description("활성 회원 수"),
            fieldWithPath("[].managerUserIds").description("기수 관리자 사용자 ID 목록"),
            fieldWithPath("[].managerUserIds[]").description("기수 관리자 사용자 ID")
        };
    }

    private static FieldDescriptor[] cohortDetailFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("기수 ID"),
            fieldWithPath("name").description("기수 이름"),
            fieldWithPath("description").description("기수 설명"),
            fieldWithPath("startDate").description("시작일"),
            fieldWithPath("endDate").description("종료일"),
            fieldWithPath("status").description("기수 상태"),
            fieldWithPath("createdByUserId").description("기수를 생성한 사용자 ID"),
            fieldWithPath("createdAt").description("기수 생성 시각"),
            fieldWithPath("updatedAt").description("기수 수정 시각")
        };
    }

    private static FieldDescriptor[] membershipFields(String prefix) {
        String p = prefix.isEmpty() ? "" : prefix + ".";
        return new FieldDescriptor[] {
            fieldWithPath(p + "id").description("소속 ID"),
            fieldWithPath(p + "cohortId").description("기수 ID"),
            fieldWithPath(p + "userId").description("사용자 ID"),
            fieldWithPath(p + "role").description("기수 내 역할"),
            fieldWithPath(p + "status").description("소속 상태"),
            fieldWithPath(p + "requestedAt").description("신청 시각"),
            fieldWithPath(p + "processedAt").description("처리 시각"),
            fieldWithPath(p + "processedByUserId").description("처리한 사용자 ID"),
            fieldWithPath(p + "rejectionReason").description("거절 사유"),
            fieldWithPath(p + "endedAt").description("소속 종료 시각"),
            fieldWithPath(p + "nickname").description("사용자 닉네임")
        };
    }

    private static FieldDescriptor[] joinCodeMetadataFields(boolean includesCode) {
        if (includesCode) {
            return new FieldDescriptor[] {
                fieldWithPath("cohortId").description("기수 ID"),
                fieldWithPath("code").description("현재 인증 세션에서 복원된 가입 코드 원문"),
                fieldWithPath("status").description("가입 코드 상태"),
                fieldWithPath("expiresAt").description("가입 코드 만료 시각"),
                fieldWithPath("issuedAt").description("가입 코드 발급 시각"),
                fieldWithPath("revokedAt").description("가입 코드 폐기 시각")
            };
        }
        return new FieldDescriptor[] {
            fieldWithPath("cohortId").description("기수 ID"),
            fieldWithPath("status").description("가입 코드 상태"),
            fieldWithPath("expiresAt").description("가입 코드 만료 시각"),
            fieldWithPath("issuedAt").description("가입 코드 발급 시각"),
            fieldWithPath("revokedAt").description("가입 코드 폐기 시각")
        };
    }

    private static FieldDescriptor[] issuedJoinCodeFields() {
        return new FieldDescriptor[] {
            fieldWithPath("cohortId").description("기수 ID"),
            fieldWithPath("code").description("새로 발급된 가입 코드 원문"),
            fieldWithPath("status").description("가입 코드 상태"),
            fieldWithPath("expiresAt").description("가입 코드 만료 시각"),
            fieldWithPath("issuedAt").description("가입 코드 발급 시각")
        };
    }

    private static String membershipResponse(String role, String status) {
        return "{\"id\":101,\"cohortId\":7,\"userId\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"%s\",\"status\":\"%s\",\"requestedAt\":\"2026-09-14T01:00:00Z\",\"processedAt\":\"2026-09-14T02:00:00Z\",\"processedByUserId\":\"00000000-0000-0000-0000-000000000002\",\"rejectionReason\":null,\"endedAt\":null,\"nickname\":\"오마\"}"
                .formatted(role, status);
    }

    private static String membershipResponseWithReason() {
        return "{\"id\":101,\"cohortId\":7,\"userId\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"STUDENT\",\"status\":\"REJECTED\",\"requestedAt\":\"2026-09-14T01:00:00Z\",\"processedAt\":\"2026-09-14T02:00:00Z\",\"processedByUserId\":\"00000000-0000-0000-0000-000000000002\",\"rejectionReason\":\"정원 초과\",\"endedAt\":null,\"nickname\":\"오마\"}";
    }
}
