package site.omagotchi.frontend.team.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;
import site.omagotchi.frontend.team.application.TeamBffService;
import site.omagotchi.frontend.team.application.result.TeamDetailView;
import site.omagotchi.frontend.team.application.result.TeamMemberCandidateView;
import site.omagotchi.frontend.team.application.result.TeamMemberView;
import site.omagotchi.frontend.team.application.result.TeamView;

@WebMvcTest(TeamBffController.class)
class TeamBffControllerTest extends FrontendMvcTestSupport {

    private static final OffsetDateTime CREATED_AT = OffsetDateTime.parse("2026-09-02T09:00:00+09:00");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TeamBffService teamBffService;

    @Test
    @DisplayName("팀 생성 BFF는 201과 팀 공개 응답을 반환한다")
    void createsTeam() throws Exception {
        when(teamBffService.create(eq(3L), eq("백엔드 팀"), any(HttpServletRequest.class)))
                .thenReturn(teamView());

        mockMvc.perform(post("/bff/v1/teams")
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cohortId\":3,\"name\":\"백엔드 팀\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teamId").value(10))
                .andExpect(jsonPath("$.name").value("백엔드 팀"))
                .andExpect(jsonPath("$.userId").doesNotExist());
    }

    @Test
    @DisplayName("내 팀 목록 BFF는 200과 팀 배열을 반환한다")
    void getsMyTeams() throws Exception {
        when(teamBffService.getMyTeams(any(HttpServletRequest.class)))
                .thenReturn(List.of(teamView()));

        mockMvc.perform(get("/bff/v1/teams/me").session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].teamId").value(10))
                .andExpect(jsonPath("$[0].userId").doesNotExist());
    }

    @Test
    @DisplayName("팀 상세 BFF는 요청자 역할을 반환하고 팀원 userId는 노출하지 않는다")
    void getsTeamDetailWithoutMemberUserId() throws Exception {
        when(teamBffService.getTeam(eq(10L), any(HttpServletRequest.class)))
                .thenReturn(new TeamDetailView(
                        10L,
                        3L,
                        "백엔드 팀",
                        CREATED_AT,
                        1,
                        101L,
                        "MASTER",
                        List.of(new TeamMemberView(101L, "요청자", "MASTER", CREATED_AT))
                ));

        mockMvc.perform(get("/bff/v1/teams/10").session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myMemberId").value(101))
                .andExpect(jsonPath("$.myRole").value("MASTER"))
                .andExpect(jsonPath("$.members[0].memberId").value(101))
                .andExpect(jsonPath("$.members[0].userId").doesNotExist())
                .andExpect(jsonPath("$.members[0].cohortMembershipId").doesNotExist());
    }

    @Test
    @DisplayName("팀원 후보 BFF는 query를 전달하고 후보에만 userId를 노출한다")
    void searchesMemberCandidates() throws Exception {
        UUID targetUserId = UUID.randomUUID();
        when(teamBffService.searchMemberCandidates(
                eq(10L), eq("학생"), any(HttpServletRequest.class)
        )).thenReturn(List.of(new TeamMemberCandidateView(
                targetUserId, "학생", "student@example.com", "AVAILABLE")));

        mockMvc.perform(get("/bff/v1/teams/10/member-candidates")
                        .queryParam("query", "학생")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(targetUserId.toString()))
                .andExpect(jsonPath("$[0].status").value("AVAILABLE"));

        verify(teamBffService).searchMemberCandidates(eq(10L), eq("학생"), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("팀원 추가 BFF는 targetUserId를 전달하고 201을 반환한다")
    void addsMember() throws Exception {
        UUID targetUserId = UUID.randomUUID();

        mockMvc.perform(post("/bff/v1/teams/10/members")
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetUserId\":\"" + targetUserId + "\"}"))
                .andExpect(status().isCreated());

        verify(teamBffService).addMember(eq(10L), eq(targetUserId), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("팀원 제외 BFF는 memberId를 전달하고 204를 반환한다")
    void kicksMember() throws Exception {
        mockMvc.perform(delete("/bff/v1/teams/10/members/102")
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(teamBffService).kickMember(eq(10L), eq(102L), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("팀 탈퇴 BFF는 204를 반환한다")
    void leavesTeam() throws Exception {
        mockMvc.perform(post("/bff/v1/teams/10/leave").session(authenticatedSession()).with(csrf()))
                .andExpect(status().isNoContent());

        verify(teamBffService).leave(eq(10L), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("마스터 위임 BFF는 memberId를 전달하고 204를 반환한다")
    void delegatesMaster() throws Exception {
        mockMvc.perform(post("/bff/v1/teams/10/members/102/delegate")
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(teamBffService).delegate(eq(10L), eq(102L), any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("팀 해체 BFF는 204를 반환한다")
    void disbandsTeam() throws Exception {
        mockMvc.perform(delete("/bff/v1/teams/10").session(authenticatedSession()).with(csrf()))
                .andExpect(status().isNoContent());

        verify(teamBffService).disband(eq(10L), any(HttpServletRequest.class));
    }

    private static TeamView teamView() {
        return new TeamView(10L, 3L, "백엔드 팀", CREATED_AT);
    }
}
