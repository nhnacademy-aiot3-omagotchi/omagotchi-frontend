package site.omagotchi.frontend.team.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import site.omagotchi.frontend.team.application.TeamBffService;
import site.omagotchi.frontend.team.application.result.TeamDetailView;
import site.omagotchi.frontend.team.application.result.TeamMemberCandidateView;
import site.omagotchi.frontend.team.application.result.TeamMemberView;
import site.omagotchi.frontend.team.application.result.TeamView;

@WebMvcTest(TeamBffController.class)
class TeamBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TeamBffService teamBffService;

    private static final Long TEAM_ID = 7L;
    private static final Long MEMBER_ID = 11L;
    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    @DisplayName("팀 생성")
    void documentsCreate() throws Exception {
        // Given: 인증 세션과 팀 생성 응답 준비
        given(teamBffService.create(eq(1L), eq("스프링팀"), any(HttpServletRequest.class)))
                .willReturn(team());

        // When & Then
        mockMvc.perform(auth(
                        post("/bff/v1/teams")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"cohortId\":1,\"name\":\"스프링팀\"}")))
                .andExpect(status().isCreated())
                .andDo(document(
                        "teams/create",
                        preprocessResponse(prettyPrint()),
                        requestFields(
                                fieldWithPath("cohortId").description("기수 ID"),
                                fieldWithPath("name").description("팀 이름")),
                        objectFields()));
    }

    @Test
    @DisplayName("내 팀 목록 조회")
    void documentsMyTeams() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        given(teamBffService.getMyTeams(any())).willReturn(List.of(team()));

        // When & Then
        mockMvc.perform(auth(get("/bff/v1/teams/me")))
                .andExpect(status().isOk())
                .andDo(document(
                        "teams/get-my-teams",
                        preprocessResponse(prettyPrint()),
                        teamFields()));
    }

    @Test
    @DisplayName("팀 상세 조회")
    void documentsGetTeam() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        given(teamBffService.getTeam(eq(TEAM_ID), any())).willReturn(detail());

        // When & Then
        mockMvc.perform(auth(get("/bff/v1/teams/{teamId}", TEAM_ID)))
                .andExpect(status().isOk())
                .andDo(document(
                        "teams/get-team",
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("teamId").description("팀 ID")),
                        detailFields()));
    }

    @Test
    @DisplayName("팀원 후보 조회")
    void documentsCandidates() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        given(teamBffService.searchMemberCandidates(eq(TEAM_ID), eq("오마"), any()))
                .willReturn(
                        List.of(
                                new TeamMemberCandidateView(
                                        USER_ID, "오마", "oma@example.com", "ACTIVE")));

        // When & Then
        mockMvc.perform(auth(
                        get("/bff/v1/teams/{teamId}/member-candidates", TEAM_ID)
                                .param("query", "오마")))
                .andExpect(status().isOk())
                .andDo(document(
                        "teams/search-member-candidates",
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("teamId").description("팀 ID")),
                        queryParameters(parameterWithName("query").description("검색어")),
                        candidateFields()));
    }

    @Test
    @DisplayName("팀원 추가")
    void documentsAddMember() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(auth(
                        post("/bff/v1/teams/{teamId}/members", TEAM_ID)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"targetUserId\":\"00000000-0000-0000-0000-000000000001\"}")))
                .andExpect(status().isCreated())
                .andDo(document(
                        "teams/add-member",
                        pathParameters(parameterWithName("teamId").description("팀 ID")),
                        requestFields(fieldWithPath("targetUserId").description("추가할 사용자 ID"))));
        verify(teamBffService).addMember(eq(TEAM_ID), eq(USER_ID), any());
    }

    @Test
    @DisplayName("팀원 제외")
    void documentsKickMember() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(auth(
                        delete(
                                        "/bff/v1/teams/{teamId}/members/{memberId}",
                                        TEAM_ID,
                                        MEMBER_ID)
                                .with(csrf())))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "teams/kick-member",
                        pathParameters(
                                parameterWithName("teamId").description("팀 ID"),
                                parameterWithName("memberId").description("팀 멤버 ID"))));
        verify(teamBffService).kickMember(eq(TEAM_ID), eq(MEMBER_ID), any());
    }

    @Test
    @DisplayName("팀 탈퇴")
    void documentsLeave() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(auth(post("/bff/v1/teams/{teamId}/leave", TEAM_ID).with(csrf())))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "teams/leave",
                        pathParameters(parameterWithName("teamId").description("팀 ID"))));
        verify(teamBffService).leave(eq(TEAM_ID), any());
    }

    @Test
    @DisplayName("마스터 위임")
    void documentsDelegate() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(auth(
                        post(
                                        "/bff/v1/teams/{teamId}/members/{memberId}/delegate",
                                        TEAM_ID,
                                        MEMBER_ID)
                                .with(csrf())))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "teams/delegate",
                        pathParameters(
                                parameterWithName("teamId").description("팀 ID"),
                                parameterWithName("memberId").description("팀 멤버 ID"))));
        verify(teamBffService).delegate(eq(TEAM_ID), eq(MEMBER_ID), any());
    }

    @Test
    @DisplayName("팀 해체")
    void documentsDisband() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(auth(delete("/bff/v1/teams/{teamId}", TEAM_ID).with(csrf())))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "teams/disband",
                        pathParameters(parameterWithName("teamId").description("팀 ID"))));
        verify(teamBffService).disband(eq(TEAM_ID), any());
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder r) {
        return r.session(authenticatedSession());
    }

    private TeamView team() {
        return new TeamView(TEAM_ID, 1L, "스프링팀", OffsetDateTime.parse("2026-08-20T09:00:00Z"));
    }

    private TeamDetailView detail() {
        return new TeamDetailView(
                TEAM_ID,
                1L,
                "스프링팀",
                OffsetDateTime.parse("2026-08-20T09:00:00Z"),
                2,
                MEMBER_ID,
                "MASTER",
                List.of(
                        new TeamMemberView(
                                MEMBER_ID,
                                "오마",
                                "MASTER",
                                OffsetDateTime.parse("2026-08-20T09:01:00Z"))));
    }

    private Snippet teamFields() {
        return responseFields(
                fieldWithPath("[].teamId").description("팀 ID"),
                fieldWithPath("[].cohortId").description("기수 ID"),
                fieldWithPath("[].name").description("팀 이름"),
                fieldWithPath("[].createdAt").description("생성 시각"));
    }

    private Snippet objectFields() {
        return responseFields(
                fieldWithPath("teamId").description("팀 ID"),
                fieldWithPath("cohortId").description("기수 ID"),
                fieldWithPath("name").description("팀 이름"),
                fieldWithPath("createdAt").description("생성 시각"));
    }

    private Snippet detailFields() {
        return responseFields(
                fieldWithPath("teamId").description("팀 ID"),
                fieldWithPath("cohortId").description("기수 ID"),
                fieldWithPath("name").description("팀 이름"),
                fieldWithPath("createdAt").description("생성 시각"),
                fieldWithPath("memberCount").description("멤버 수"),
                fieldWithPath("myMemberId").description("내 멤버 ID"),
                fieldWithPath("myRole").description("내 역할"),
                fieldWithPath("members").description("팀 멤버 목록"),
                fieldWithPath("members[].memberId").description("멤버 ID"),
                fieldWithPath("members[].displayName").description("표시 이름"),
                fieldWithPath("members[].role").description("역할"),
                fieldWithPath("members[].joinedAt").description("가입 시각"));
    }

    private Snippet candidateFields() {
        return responseFields(
                fieldWithPath("[].userId").description("사용자 ID"),
                fieldWithPath("[].displayName").description("표시 이름"),
                fieldWithPath("[].email").description("이메일"),
                fieldWithPath("[].status").description("상태"));
    }
}
