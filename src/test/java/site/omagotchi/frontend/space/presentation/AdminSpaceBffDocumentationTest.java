package site.omagotchi.frontend.space.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.request.ParameterDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningUpdateSpaceRequest;
import site.omagotchi.frontend.space.application.AdminSpaceBffService;
import site.omagotchi.frontend.space.presentation.response.AdminActiveOccupancyResponse;
import site.omagotchi.frontend.space.presentation.response.OccupancyParticipantResponse;
import site.omagotchi.frontend.space.presentation.response.SpacePresenceDetailResponse;
import site.omagotchi.frontend.space.presentation.response.SpacePresenceOccupantResponse;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest(AdminSpaceBffController.class)
class AdminSpaceBffDocumentationTest extends FrontendRestDocsTestSupport {

    private static final long SPACE_ID = 3L;
    private static final long COHORT_ID = 7L;
    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final LearningSpaceMutationRequest CREATE_REQUEST =
            new LearningSpaceMutationRequest("회의실 A", "MEETING", 8, COHORT_ID);
    private static final LearningUpdateSpaceRequest UPDATE_REQUEST =
            new LearningUpdateSpaceRequest("회의실 A", "MEETING", 8);
    private static final LearningAssignSpaceCohortRequest COHORT_REQUEST =
            new LearningAssignSpaceCohortRequest(COHORT_ID);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminSpaceBffService service;

    @Test
    @DisplayName("활성 점유 조회")
    void documentsActiveOccupancies() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.getActiveOccupancies(any(HttpServletRequest.class)))
                .thenReturn(
                        List.of(
                                new AdminActiveOccupancyResponse(
                                        SPACE_ID,
                                        "회의실 A",
                                        9L,
                                        USER_ID,
                                        "오마",
                                        2,
                                        OffsetDateTime.parse("2026-09-14T09:00:00+09:00"),
                                        OffsetDateTime.parse("2026-09-14T11:00:00+09:00"),
                                        3600L,
                                        "ACTIVE")));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.get("/bff/v1/admin/spaces/occupancies")
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].spaceId").value(3),
                        jsonPath("$[0].occupancyId").value(9),
                        jsonPath("$[0].occupierUserId").value(USER_ID.toString()),
                        jsonPath("$[0].participantCount").value(2),
                        jsonPath("$[0].remainingTimeSeconds").value(3600),
                        jsonPath("$[0].status").value("ACTIVE"))
                .andDo(document(
                        "admin-spaces/active-occupancies",
                        responseFields(activeOccupancyFields())));
        verify(service).getActiveOccupancies(any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("점유 참여자 조회")
    void documentsOccupancyParticipants() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.getParticipants(eq(SPACE_ID), any(HttpServletRequest.class)))
                .thenReturn(List.of(new OccupancyParticipantResponse(USER_ID, "오마", true)));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.get(
                                "/bff/v1/admin/spaces/{spaceId}/occupancies/participants",
                                SPACE_ID)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].userId").value(USER_ID.toString()),
                        jsonPath("$[0].displayName").value("오마"),
                        jsonPath("$[0].occupier").value(true))
                .andDo(document(
                        "admin-spaces/occupancy-participants",
                        pathParameters(spaceId()),
                        responseFields(participantFields())));
        verify(service).getParticipants(eq(SPACE_ID), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("현재 체류자 조회")
    void documentsCurrentPresences() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.getCurrentPresences(
                        eq(COHORT_ID), eq(SPACE_ID), any(HttpServletRequest.class)))
                .thenReturn(
                        new SpacePresenceDetailResponse(
                                SPACE_ID,
                                4L,
                                1L,
                                3L,
                                List.of(new SpacePresenceOccupantResponse(USER_ID, "오마"))));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.get(
                                "/bff/v1/admin/spaces/{spaceId}/presences", SPACE_ID)
                        .param("cohortId", "7")
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.spaceId").value(3),
                        jsonPath("$.totalCount").value(4),
                        jsonPath("$.cohortCount").value(1),
                        jsonPath("$.otherCohortCount").value(3),
                        jsonPath("$.occupants[0].userId").value(USER_ID.toString()),
                        jsonPath("$.occupants[0].displayName").value("오마"))
                .andDo(document(
                        "admin-spaces/current-presences",
                        pathParameters(spaceId()),
                        queryParameters(parameterWithName("cohortId").description("현재 인원을 분류할 기수 ID")),
                        responseFields(presenceFields())));
        verify(service)
                .getCurrentPresences(eq(COHORT_ID), eq(SPACE_ID), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("점유 강제 반납")
    void documentsForceRelease() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.post(
                                "/bff/v1/admin/spaces/{spaceId}/occupancies/force-release",
                                SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document("admin-spaces/force-release", pathParameters(spaceId())));
        verify(service).forceRelease(eq(SPACE_ID), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공간 생성")
    void documentsCreateSpace() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.create(eq(CREATE_REQUEST), any(HttpServletRequest.class)))
                .thenReturn(
                        json(
                                "{\"id\":3,\"name\":\"회의실 A\",\"type\":\"MEETING\",\"capacity\":8,\"cohortId\":7,\"createdAt\":\"2026-09-14T00:00:00+09:00\"}"));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.post("/bff/v1/admin/spaces")
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"회의실 A\",\"type\":\"MEETING\",\"capacity\":8,\"cohortId\":7}"))
                .andExpectAll(
                        status().isCreated(),
                        jsonPath("$.id").value(3),
                        jsonPath("$.name").value("회의실 A"),
                        jsonPath("$.type").value("MEETING"),
                        jsonPath("$.capacity").value(8),
                        jsonPath("$.cohortId").value(7),
                        jsonPath("$.createdAt").value("2026-09-14T00:00:00+09:00"))
                .andDo(document(
                        "admin-spaces/create",
                        requestFields(createRequestFields()),
                        responseFields(createResponseFields())));
        verify(service).create(eq(CREATE_REQUEST), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공간 수정")
    void documentsUpdateSpace() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.update(eq(SPACE_ID), eq(UPDATE_REQUEST), any(HttpServletRequest.class)))
                .thenReturn(
                        json(
                                "{\"id\":3,\"name\":\"회의실 A\",\"type\":\"MEETING\",\"capacity\":8,\"updatedAt\":\"2026-09-14T01:00:00+09:00\"}"));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.put(
                                "/bff/v1/admin/spaces/{spaceId}", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"회의실 A\",\"type\":\"MEETING\",\"capacity\":8}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(3),
                        jsonPath("$.type").value("MEETING"),
                        jsonPath("$.capacity").value(8),
                        jsonPath("$.updatedAt").value("2026-09-14T01:00:00+09:00"))
                .andDo(document(
                        "admin-spaces/update",
                        pathParameters(spaceId()),
                        requestFields(updateRequestFields()),
                        responseFields(updateResponseFields())));
        verify(service).update(eq(SPACE_ID), eq(UPDATE_REQUEST), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공간 활성화")
    void documentsActivateSpace() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.activate(eq(SPACE_ID), any(HttpServletRequest.class)))
                .thenReturn(
                        json(
                                "{\"id\":3,\"operationalStatus\":\"ACTIVE\",\"inactiveReason\":null,\"updatedAt\":\"2026-09-14T01:00:00+09:00\"}"));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.post(
                                "/bff/v1/admin/spaces/{spaceId}/activate", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(3),
                        jsonPath("$.operationalStatus").value("ACTIVE"),
                        jsonPath("$.inactiveReason").doesNotExist(),
                        jsonPath("$.updatedAt").value("2026-09-14T01:00:00+09:00"))
                .andDo(document(
                        "admin-spaces/activate",
                        pathParameters(spaceId()),
                        responseFields(statusResponseFields())));
        verify(service).activate(eq(SPACE_ID), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공간 비활성화")
    void documentsDeactivateSpace() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.deactivate(eq(SPACE_ID), eq("정기 점검"), any(HttpServletRequest.class)))
                .thenReturn(
                        json(
                                "{\"id\":3,\"operationalStatus\":\"INACTIVE\",\"inactiveReason\":\"정기 점검\",\"updatedAt\":\"2026-09-14T02:00:00+09:00\"}"));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.post(
                                "/bff/v1/admin/spaces/{spaceId}/deactivate", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inactiveReason\":\"정기 점검\"}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(3),
                        jsonPath("$.operationalStatus").value("INACTIVE"),
                        jsonPath("$.inactiveReason").value("정기 점검"),
                        jsonPath("$.updatedAt").value("2026-09-14T02:00:00+09:00"))
                .andDo(document(
                        "admin-spaces/deactivate",
                        pathParameters(spaceId()),
                        requestFields(fieldWithPath("inactiveReason").description("공간 비활성화 사유")),
                        responseFields(statusResponseFields())));
        verify(service).deactivate(eq(SPACE_ID), eq("정기 점검"), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공간 삭제")
    void documentsDeleteSpace() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.delete(
                                "/bff/v1/admin/spaces/{spaceId}", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document("admin-spaces/delete", pathParameters(spaceId())));
        verify(service).delete(eq(SPACE_ID), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("기수 배정")
    void documentsAssignCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        when(service.assignCohort(eq(SPACE_ID), eq(COHORT_REQUEST), any(HttpServletRequest.class)))
                .thenReturn(json("{\"id\":3,\"cohortId\":7,\"updatedAt\":\"2026-09-14T03:00:00+09:00\"}"));

        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.put(
                                "/bff/v1/admin/spaces/{spaceId}/cohort", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cohortId\":7}"))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.id").value(3),
                        jsonPath("$.cohortId").value(7),
                        jsonPath("$.updatedAt").value("2026-09-14T03:00:00+09:00"))
                .andDo(document(
                        "admin-spaces/assign-cohort",
                        pathParameters(spaceId()),
                        requestFields(fieldWithPath("cohortId").description("배정할 기수 ID")),
                        responseFields(cohortResponseFields())));
        verify(service)
                .assignCohort(eq(SPACE_ID), eq(COHORT_REQUEST), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("기수 배정 해제")
    void documentsUnassignCohort() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(RestDocumentationRequestBuilders.delete(
                                "/bff/v1/admin/spaces/{spaceId}/cohort", SPACE_ID)
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document("admin-spaces/unassign-cohort", pathParameters(spaceId())));
        verify(service).unassignCohort(eq(SPACE_ID), any(HttpServletRequest.class));
    }

    private static ParameterDescriptor spaceId() {
        return parameterWithName("spaceId").description("공간 ID");
    }

    private static FieldDescriptor[] activeOccupancyFields() {
        return new FieldDescriptor[] {
            fieldWithPath("[].spaceId").description("공간 ID"),
            fieldWithPath("[].spaceName").description("공간 이름"),
            fieldWithPath("[].occupancyId").description("점유 ID"),
            fieldWithPath("[].occupierUserId").description("점유자 사용자 ID"),
            fieldWithPath("[].occupierDisplayName").description("점유자 표시 이름"),
            fieldWithPath("[].participantCount").description("참여자 수"),
            fieldWithPath("[].startedAt").description("점유 시작 시각"),
            fieldWithPath("[].expiresAt").description("점유 만료 시각"),
            fieldWithPath("[].remainingTimeSeconds").description("남은 점유 시간(초)"),
            fieldWithPath("[].status").description("점유 상태")
        };
    }

    private static FieldDescriptor[] participantFields() {
        return new FieldDescriptor[] {
            fieldWithPath("[].userId").description("참여자 사용자 ID"),
            fieldWithPath("[].displayName").description("참여자 표시 이름"),
            fieldWithPath("[].occupier").description("점유자 여부")
        };
    }

    private static FieldDescriptor[] presenceFields() {
        return new FieldDescriptor[] {
            fieldWithPath("spaceId").description("공간 ID"),
            fieldWithPath("totalCount").description("전체 현재 체류자 수"),
            fieldWithPath("cohortCount").description("선택 기수 체류자 수"),
            fieldWithPath("otherCohortCount").description("다른 기수 체류자 수"),
            fieldWithPath("occupants").description("현재 체류자 목록"),
            fieldWithPath("occupants[].userId").description("체류자 사용자 ID"),
            fieldWithPath("occupants[].displayName").description("체류자 표시 이름")
        };
    }

    private static FieldDescriptor[] createRequestFields() {
        return new FieldDescriptor[] {
            fieldWithPath("name").description("공간 이름"),
            fieldWithPath("type").description("공간 유형"),
            fieldWithPath("capacity").description("공간 정원"),
            fieldWithPath("cohortId").description("관리 기수 ID")
        };
    }

    private static FieldDescriptor[] updateRequestFields() {
        return new FieldDescriptor[] {
            fieldWithPath("name").description("공간 이름"),
            fieldWithPath("type").description("공간 유형"),
            fieldWithPath("capacity").description("공간 정원")
        };
    }

    private static FieldDescriptor[] createResponseFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("공간 ID"),
            fieldWithPath("name").description("공간 이름"),
            fieldWithPath("type").description("공간 유형"),
            fieldWithPath("capacity").description("공간 정원"),
            fieldWithPath("cohortId").description("관리 기수 ID"),
            fieldWithPath("createdAt").description("생성 시각")
        };
    }

    private static FieldDescriptor[] updateResponseFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("공간 ID"),
            fieldWithPath("name").description("공간 이름"),
            fieldWithPath("type").description("공간 유형"),
            fieldWithPath("capacity").description("공간 정원"),
            fieldWithPath("updatedAt").description("수정 시각")
        };
    }

    private static FieldDescriptor[] statusResponseFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("공간 ID"),
            fieldWithPath("operationalStatus").description("운영 상태"),
            fieldWithPath("inactiveReason").description("비활성 사유"),
            fieldWithPath("updatedAt").description("수정 시각")
        };
    }

    private static FieldDescriptor[] cohortResponseFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("공간 ID"),
            fieldWithPath("cohortId").description("관리 기수 ID"),
            fieldWithPath("updatedAt").description("수정 시각")
        };
    }

    private static JsonNode json(String value) {
        return JsonMapper.builder().build().readTree(value);
    }
}
