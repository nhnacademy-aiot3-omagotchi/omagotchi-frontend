package site.omagotchi.frontend.cohort.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import site.omagotchi.frontend.cohort.application.UserAccessContextBffService;
import site.omagotchi.frontend.cohort.infrastructure.response.CohortAccessSummaryResponse;
import site.omagotchi.frontend.cohort.infrastructure.response.UserAccessContextResponse;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest(CohortBffController.class)
class CohortBffDocumentationTest extends FrontendRestDocsTestSupport {

    private static final Cookie SESSION = new Cookie("SESSION", "session-placeholder");
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @MockitoBean
    private LearningProxyBffService proxy;

    @MockitoBean
    private UserAccessContextBffService accessContextService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("내 접근 권한 조회")
    void documentsMyAccessContext() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(accessContextService.getContext(any()))
                .thenReturn(
                        new UserAccessContextResponse(
                                "USER",
                                "STUDENT",
                                List.of(
                                        new CohortAccessSummaryResponse(
                                                7L,
                                                "AIoT 3기",
                                                LocalDate.parse("2026-08-01"),
                                                LocalDate.parse("2026-11-30"),
                                                "ACTIVE")),
                                List.of(
                                        new CohortAccessSummaryResponse(
                                                8L,
                                                "AIoT 4기",
                                                LocalDate.parse("2026-09-01"),
                                                LocalDate.parse("2026-12-31"),
                                                "PREPARING"))));

        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.get("/bff/v1/cohorts/me/access-context")
                        .cookie(SESSION)
                        .session(authenticatedSession()))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.accessType").value("STUDENT"))
                .andExpect(MockMvcResultMatchers.jsonPath("$.studentCohorts[0].cohortId").value(8))
                .andDo(document(
                        "cohorts/my-access-context",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("globalRole").description("전역 역할"),
                                fieldWithPath("accessType").description("현재 접근 유형"),
                                fieldWithPath("cohortManager")
                                        .description("기수 관리자 여부. accessType이 COHORT_MANAGER이면 true"),
                                fieldWithPath("managedCohorts").description("관리 중인 기수 목록"),
                                fieldWithPath("managedCohorts[].cohortId")
                                        .description("기수 ID")
                                        .optional(),
                                fieldWithPath("managedCohorts[].name")
                                        .description("기수 이름")
                                        .optional(),
                                fieldWithPath("managedCohorts[].startDate")
                                        .description("시작일")
                                        .optional(),
                                fieldWithPath("managedCohorts[].endDate")
                                        .description("종료일")
                                        .optional(),
                                fieldWithPath("managedCohorts[].status")
                                        .description("기수 상태")
                                        .optional(),
                                fieldWithPath("studentCohorts")
                                        .description("학생으로 소속된 기수 목록"),
                                fieldWithPath("studentCohorts[].cohortId")
                                        .description("기수 ID")
                                        .optional(),
                                fieldWithPath("studentCohorts[].name")
                                        .description("기수 이름")
                                        .optional(),
                                fieldWithPath("studentCohorts[].startDate")
                                        .description("시작일")
                                        .optional(),
                                fieldWithPath("studentCohorts[].endDate")
                                        .description("종료일")
                                        .optional(),
                                fieldWithPath("studentCohorts[].status")
                                        .description("기수 상태")
                                        .optional())));
    }

    @Test
    @DisplayName("기수 목록 조회")
    void documentsCohortList() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        stubProxy(
                "[{\"id\":7,\"name\":\"AIoT 3기\",\"description\":\"Backend\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-11-30\",\"status\":\"ACTIVE\",\"createdByUserId\":\"00000000-0000-0000-0000-000000000001\",\"createdAt\":\"2026-08-01T09:00:00Z\",\"updatedAt\":\"2026-08-02T09:00:00Z\"}]");

        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.get("/bff/v1/cohorts")
                        .cookie(SESSION)
                        .session(authenticatedSession()))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$[0].id").value(7))
                .andDo(document(
                        "cohorts/list",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        cohortFields()));
    }

    @Test
    @DisplayName("기수 상세 조회")
    void documentsCohortDetail() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        stubProxy(
                "{\"id\":7,\"name\":\"AIoT 3기\",\"description\":\"Backend\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-11-30\",\"status\":\"ACTIVE\",\"createdByUserId\":\"00000000-0000-0000-0000-000000000001\",\"createdAt\":\"2026-08-01T09:00:00Z\",\"updatedAt\":\"2026-08-02T09:00:00Z\"}");

        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.get("/bff/v1/cohorts/{cohort-id}", 7L)
                        .cookie(SESSION)
                        .session(authenticatedSession()))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.name").value("AIoT 3기"))
                .andDo(document(
                        "cohorts/detail",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("cohort-id").description("조회할 기수 ID")),
                        cohortObjectFields()));
    }

    @Test
    @DisplayName("기수 가입 신청")
    void documentsApplyToCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        stubProxy(
                "{\"id\":101,\"cohortId\":7,\"userId\":\"00000000-0000-0000-0000-000000000002\",\"role\":\"STUDENT\",\"status\":\"PENDING\",\"requestedAt\":\"2026-08-20T09:00:00Z\",\"processedAt\":null,\"processedByUserId\":null,\"rejectionReason\":null,\"endedAt\":null,\"nickname\":\"고스트\"}");

        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.post("/bff/v1/cohorts/applications")
                        .cookie(SESSION)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType("application/json")
                        .content("{\"cohortId\":7}"))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$.status").value("PENDING"))
                .andDo(document(
                        "cohorts/apply",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        requestFields(fieldWithPath("cohortId").description("신청할 기수 ID")),
                        membershipObjectFields()));
    }

    @Test
    @DisplayName("내 가입 신청 조회")
    void documentsMyApplications() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        stubProxy(
                "[{\"id\":101,\"cohortId\":7,\"userId\":\"00000000-0000-0000-0000-000000000002\",\"role\":\"STUDENT\",\"status\":\"PENDING\",\"requestedAt\":\"2026-08-20T09:00:00Z\",\"processedAt\":null,\"processedByUserId\":null,\"rejectionReason\":null,\"endedAt\":null,\"nickname\":\"고스트\"}]");

        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.get("/bff/v1/cohorts/applications/me")
                        .cookie(SESSION)
                        .session(authenticatedSession()))
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("$[0].cohortId").value(7))
                .andDo(document(
                        "cohorts/my-applications",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        membershipListFields()));
    }

    @Test
    @DisplayName("잘못된 기수 ID 거부")
    void rejectsNonNumericCohortId() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.get("/bff/v1/cohorts/not-a-number")
                        .cookie(SESSION)
                        .session(authenticatedSession()))
                .andExpect(MockMvcResultMatchers.status().isBadRequest())
                .andDo(document(
                        "cohorts/invalid-cohort-id",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint())));
    }

    private void stubProxy(String body) throws Exception {
        JsonNode response = jsonMapper.readTree(body);
        when(proxy.execute(any(), any())).thenReturn(response);
    }

    private static Snippet cohortFields() {
        return responseFields(
                fieldWithPath("[].id").description("기수 ID"),
                fieldWithPath("[].name").description("기수 이름"),
                fieldWithPath("[].description").description("기수 설명").optional(),
                fieldWithPath("[].startDate").description("시작일"),
                fieldWithPath("[].endDate").description("종료일"),
                fieldWithPath("[].status").description("기수 상태"),
                fieldWithPath("[].createdByUserId").description("생성자 사용자 ID"),
                fieldWithPath("[].createdAt").description("생성 시각"),
                fieldWithPath("[].updatedAt").description("수정 시각"));
    }

    private static Snippet cohortObjectFields() {
        return responseFields(
                fieldWithPath("id").description("기수 ID"),
                fieldWithPath("name").description("기수 이름"),
                fieldWithPath("description").description("기수 설명").optional(),
                fieldWithPath("startDate").description("시작일"),
                fieldWithPath("endDate").description("종료일"),
                fieldWithPath("status").description("기수 상태"),
                fieldWithPath("createdByUserId").description("생성자 사용자 ID"),
                fieldWithPath("createdAt").description("생성 시각"),
                fieldWithPath("updatedAt").description("수정 시각"));
    }

    private static Snippet membershipListFields() {
        return responseFields(
                fieldWithPath("[].id").description("소속·신청 ID"),
                fieldWithPath("[].cohortId").description("기수 ID"),
                fieldWithPath("[].userId").description("사용자 ID"),
                fieldWithPath("[].role").description("기수 역할"),
                fieldWithPath("[].status").description("신청·소속 상태"),
                fieldWithPath("[].requestedAt").description("신청 시각"),
                fieldWithPath("[].processedAt").description("처리 시각").optional(),
                fieldWithPath("[].processedByUserId").description("처리자 사용자 ID").optional(),
                fieldWithPath("[].rejectionReason").description("거절 사유").optional(),
                fieldWithPath("[].endedAt").description("종료 시각").optional(),
                fieldWithPath("[].nickname").description("표시 이름").optional());
    }

    private static Snippet membershipObjectFields() {
        return responseFields(
                fieldWithPath("id").description("소속·신청 ID"),
                fieldWithPath("cohortId").description("기수 ID"),
                fieldWithPath("userId").description("사용자 ID"),
                fieldWithPath("role").description("기수 역할"),
                fieldWithPath("status").description("신청·소속 상태"),
                fieldWithPath("requestedAt").description("신청 시각"),
                fieldWithPath("processedAt").description("처리 시각").optional(),
                fieldWithPath("processedByUserId").description("처리자 사용자 ID").optional(),
                fieldWithPath("rejectionReason").description("거절 사유").optional(),
                fieldWithPath("endedAt").description("종료 시각").optional(),
                fieldWithPath("nickname").description("표시 이름").optional());
    }
}
