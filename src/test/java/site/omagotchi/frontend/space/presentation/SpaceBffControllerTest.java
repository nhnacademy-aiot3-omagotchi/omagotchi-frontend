package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.application.result.OccupancyView;
import site.omagotchi.frontend.space.application.result.SpaceView;
import site.omagotchi.frontend.space.application.result.ParticipantCandidateView;
import site.omagotchi.frontend.space.application.result.OccupancyParticipantView;
import site.omagotchi.frontend.space.application.result.SelectableLabView;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SpaceBffControllerTest {

    @Mock
    private SpaceBffService spaceBffService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new SpaceBffController(spaceBffService)
        ).build();
    }

    @Test
    @DisplayName("공간 목록 BFF는 요청자 전용 상태를 200 응답으로 변환")
    void findsSpaces() throws Exception {
        when(spaceBffService.findAll(any(HttpServletRequest.class))).thenReturn(List.of(
                new SpaceView(
                        1L,
                        "회의실 A",
                        "MEETING",
                        8,
                        "ACTIVE",
                        null,
                        null,
                        "OCCUPIED",
                        OffsetDateTime.parse("2026-08-18T15:00:00+09:00"),
                        1200L,
                        true,
                        true,
                        true,
                        2
                )
        ));

        mockMvc.perform(get("/bff/v1/spaces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spaceId").value(1))
                .andExpect(jsonPath("$[0].occupiedByRequester").value(true))
                .andExpect(jsonPath("$[0].participatingByRequester").value(true))
                .andExpect(jsonPath("$[0].participantCount").value(2))
                .andExpect(jsonPath("$[0].assignedToRequesterCohort").doesNotExist())
                .andExpect(jsonPath("$[0].occupancyExtensionCount").doesNotExist())
                .andExpect(jsonPath("$[0].occupierUserId").doesNotExist());

        verify(spaceBffService).findAll(any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("선택 가능 실습실 BFF는 정원 예약 수를 반환")
    void findsSelectableLabs() throws Exception {
        when(spaceBffService.findSelectableLabs(any(HttpServletRequest.class)))
                .thenReturn(List.of(new SelectableLabView(
                        11L,
                        "3기 실습실",
                        2,
                        2L
                )));

        mockMvc.perform(get("/bff/v1/spaces/labs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spaceId").value(11))
                .andExpect(jsonPath("$[0].capacity").value(2))
                .andExpect(jsonPath("$[0].reservedCount").value(2));

        verify(spaceBffService).findSelectableLabs(any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("점유 시작 BFF는 201과 응답 본문을 반환")
    void startsOccupancy() throws Exception {
        when(spaceBffService.startOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        )).thenReturn(occupancyView());

        mockMvc.perform(post("/bff/v1/spaces/3/occupancies"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.occupancyId").value(9))
                .andExpect(jsonPath("$.spaceId").value(3));

        verify(spaceBffService).startOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        );
    }

    @Test
    @DisplayName("점유 연장 BFF는 200과 응답 본문을 반환")
    void extendsOccupancy() throws Exception {
        when(spaceBffService.extendOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        )).thenReturn(occupancyView());

        mockMvc.perform(post("/bff/v1/spaces/3/occupancies/extend"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.extensionCount").value(1));

        verify(spaceBffService).extendOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        );
    }

    @Test
    @DisplayName("점유 반납 BFF는 204를 반환")
    void releasesOccupancy() throws Exception {
        mockMvc.perform(post("/bff/v1/spaces/3/occupancies/release"))
                .andExpect(status().isNoContent());

        verify(spaceBffService).releaseOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        );
    }

    @Test
    @DisplayName("본인 참여 종료 BFF는 204를 반환")
    void leavesOccupancy() throws Exception {
        mockMvc.perform(delete("/bff/v1/spaces/3/occupancies/participants/me"))
                .andExpect(status().isNoContent());

        verify(spaceBffService).leaveOccupancy(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        );
    }

    @Test
    @DisplayName("참여 후보 검색 BFF는 query와 요청을 전달")
    void searchesParticipantCandidates() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(spaceBffService.searchParticipantCandidates(
                org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("사용자"),
                any(HttpServletRequest.class)
        )).thenReturn(List.of(new ParticipantCandidateView(
                targetId, "사용자", "user@example.com", "AVAILABLE")));

        mockMvc.perform(get("/bff/v1/spaces/3/occupancies/participants/candidates")
                        .queryParam("query", "사용자"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(targetId.toString()))
                .andExpect(jsonPath("$[0].email").value("user@example.com"));
    }

    @Test
    @DisplayName("현재 참여자 상세 조회 BFF")
    void getsParticipants() throws Exception {
        UUID userId = UUID.randomUUID();
        when(spaceBffService.getParticipants(
                org.mockito.ArgumentMatchers.eq(3L), any(HttpServletRequest.class)))
                .thenReturn(List.of(new OccupancyParticipantView(userId, "사용자", true)));

        mockMvc.perform(get("/bff/v1/spaces/3/occupancies/participants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].occupier").value(true));
    }

    @Test
    @DisplayName("참여자 추가 BFF는 201")
    void addsParticipant() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(post("/bff/v1/spaces/3/occupancies/participants")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":\"" + targetId + "\"}"))
                .andExpect(status().isCreated());

        verify(spaceBffService).addParticipant(
                org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq(targetId),
                any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("대상 참여자 제외 BFF는 204")
    void removesParticipant() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(delete("/bff/v1/spaces/3/occupancies/participants/" + targetId))
                .andExpect(status().isNoContent());

        verify(spaceBffService).removeParticipant(
                org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq(targetId),
                any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("공실 알림 신청 BFF는 201을 반환")
    void requestsVacancyAlert() throws Exception {
        mockMvc.perform(post("/bff/v1/spaces/3/vacancy-alerts"))
                .andExpect(status().isCreated());

        verify(spaceBffService).requestVacancyAlert(
                org.mockito.ArgumentMatchers.eq(3L),
                any(HttpServletRequest.class)
        );
    }

    private static OccupancyView occupancyView() {
        return new OccupancyView(
                9L,
                3L,
                "ACTIVE",
                OffsetDateTime.parse("2026-08-18T14:00:00+09:00"),
                OffsetDateTime.parse("2026-08-18T16:00:00+09:00"),
                1,
                7200L
        );
    }
}
