package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningUpdateSpaceRequest;
import site.omagotchi.frontend.space.application.AdminSpaceBffService;
import site.omagotchi.frontend.space.presentation.response.AdminActiveOccupancyResponse;
import site.omagotchi.frontend.space.presentation.response.OccupancyParticipantResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class AdminSpaceBffControllerTest {

    private static final String UPSERT_BODY = """
            {"name":"회의실 A","type":"MEETING","capacity":8,"cohortId":1}
            """;
    private static final LearningSpaceMutationRequest PAYLOAD =
            new LearningSpaceMutationRequest("회의실 A", "MEETING", 8, 1L);
    private static final LearningUpdateSpaceRequest UPDATE =
            new LearningUpdateSpaceRequest("회의실 A", "MEETING", 8);

    @Mock
    private AdminSpaceBffService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminSpaceBffController(service)).build();
    }

    @Test
    void createsWith201AndBody() throws Exception {
        when(service.create(eq(PAYLOAD), any(HttpServletRequest.class)))
                .thenReturn(json("{\"id\":3,\"name\":\"회의실 A\"}"));

        mockMvc.perform(post("/bff/v1/admin/spaces")
                        .contentType("application/json")
                        .content(UPSERT_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3));

        verify(service).create(eq(PAYLOAD), any(HttpServletRequest.class));
    }

    @Test
    void updatesWith200AndBody() throws Exception {
        when(service.update(eq(3L), eq(UPDATE), any(HttpServletRequest.class)))
                .thenReturn(json("{\"id\":3,\"capacity\":8}"));

        mockMvc.perform(put("/bff/v1/admin/spaces/3")
                        .contentType("application/json")
                        .content("{\"name\":\"회의실 A\",\"type\":\"MEETING\",\"capacity\":8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacity").value(8));

        verify(service).update(eq(3L), eq(UPDATE), any(HttpServletRequest.class));
    }

    @Test
    void activatesWith200AndBody() throws Exception {
        when(service.activate(eq(3L), any(HttpServletRequest.class)))
                .thenReturn(json("{\"id\":3,\"operationalStatus\":\"ACTIVE\"}"));

        mockMvc.perform(post("/bff/v1/admin/spaces/3/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.operationalStatus").value("ACTIVE"));
    }

    @Test
    void deactivatesWithReasonAnd200Body() throws Exception {
        when(service.deactivate(eq(3L), eq("정기 점검"), any(HttpServletRequest.class)))
                .thenReturn(json("{\"id\":3,\"operationalStatus\":\"INACTIVE\"}"));

        mockMvc.perform(post("/bff/v1/admin/spaces/3/deactivate")
                        .contentType("application/json")
                        .content("{\"inactiveReason\":\"정기 점검\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.operationalStatus").value("INACTIVE"));

        verify(service).deactivate(eq(3L), eq("정기 점검"), any(HttpServletRequest.class));
    }

    @Test
    void deletesWith204() throws Exception {
        mockMvc.perform(delete("/bff/v1/admin/spaces/3"))
                .andExpect(status().isNoContent());

        verify(service).delete(eq(3L), any(HttpServletRequest.class));
    }

    @Test
    void acceptsStudyAndOfficeTypes() throws Exception {
        for (String type : new String[]{"STUDY", "OFFICE"}) {
            LearningSpaceMutationRequest payload = new LearningSpaceMutationRequest("공간 A", type, 8, 1L);
            when(service.create(eq(payload), any(HttpServletRequest.class)))
                    .thenReturn(json("{\"id\":3}"));

            mockMvc.perform(post("/bff/v1/admin/spaces")
                            .contentType("application/json")
                            .content("{\"name\":\"공간 A\",\"type\":\"" + type + "\",\"capacity\":8,\"cohortId\":1}"))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void assignsAndUnassignsCohort() throws Exception {
        LearningAssignSpaceCohortRequest payload = new LearningAssignSpaceCohortRequest(1L);
        when(service.assignCohort(eq(3L), eq(payload), any(HttpServletRequest.class)))
                .thenReturn(json("{\"cohortId\":1}"));

        mockMvc.perform(put("/bff/v1/admin/spaces/3/cohort")
                        .contentType("application/json")
                        .content("{\"cohortId\":1}"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/bff/v1/admin/spaces/3/cohort"))
                .andExpect(status().isNoContent());

        verify(service).assignCohort(eq(3L), eq(payload), any(HttpServletRequest.class));
        verify(service).unassignCohort(eq(3L), any(HttpServletRequest.class));
    }

    @Test
    void relaysAdminOccupancyManagementEndpoints() throws Exception {
        UUID userId = UUID.randomUUID();
        when(service.getActiveOccupancies(any(HttpServletRequest.class))).thenReturn(List.of(
                new AdminActiveOccupancyResponse(
                        3L, "회의실 A", 9L, userId, "점유자", 1,
                        OffsetDateTime.parse("2026-08-28T09:00:00+09:00"),
                        OffsetDateTime.parse("2026-08-28T11:00:00+09:00"), 3600L, "ACTIVE")));
        when(service.getParticipants(eq(3L), any(HttpServletRequest.class))).thenReturn(List.of(
                new OccupancyParticipantResponse(userId, "점유자", true)));

        mockMvc.perform(get("/bff/v1/admin/spaces/occupancies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spaceId").value(3))
                .andExpect(jsonPath("$[0].spaceName").value("회의실 A"))
                .andExpect(jsonPath("$[0].occupancyId").value(9))
                .andExpect(jsonPath("$[0].occupierUserId").value(userId.toString()))
                .andExpect(jsonPath("$[0].occupierDisplayName").value("점유자"))
                .andExpect(jsonPath("$[0].participantCount").value(1))
                .andExpect(jsonPath("$[0].startedAt").value("2026-08-28T09:00:00+09:00"))
                .andExpect(jsonPath("$[0].expiresAt").value("2026-08-28T11:00:00+09:00"))
                .andExpect(jsonPath("$[0].remainingTimeSeconds").value(3600))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
        mockMvc.perform(get("/bff/v1/admin/spaces/3/occupancies/participants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(userId.toString()))
                .andExpect(jsonPath("$[0].displayName").value("점유자"))
                .andExpect(jsonPath("$[0].occupier").value(true));
        mockMvc.perform(post("/bff/v1/admin/spaces/3/occupancies/force-release"))
                .andExpect(status().isNoContent());

        verify(service).forceRelease(eq(3L), any(HttpServletRequest.class));
    }

    private static JsonNode json(String value) {
        return JsonMapper.builder().build().readTree(value);
    }
}
