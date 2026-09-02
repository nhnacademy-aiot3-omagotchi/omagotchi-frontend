package site.omagotchi.frontend.team.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.ApiErrorResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddTeamMemberRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningCreateTeamRequest;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamDetailResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamMemberCandidateResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamMemberResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamResponse;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamBffServiceTest {

    private static final UUID USER_ID = UUID.fromString(
            "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"
    );
    private static final String BEARER = "Bearer access-token";
    private static final OffsetDateTime CREATED_AT =
            OffsetDateTime.parse("2026-09-02T09:00:00+09:00");

    @Mock
    private LearningHttpService learningHttpService;

    private TeamBffService service;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
        request = new MockHttpServletRequest();
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                USER_ID,
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-09-02T00:00:00Z"),
                "refresh-token",
                Instant.parse("2026-09-09T00:00:00Z")
        ));
        service = new TeamBffService(
                learningHttpService,
                new LearningGatewayCallExecutor(new ApiErrorResponseDecoder()),
                new LearningSessionAuthorization(sessionTokens)
        );
    }

    @Test
    @DisplayName("팀 생성은 기수와 이름 및 Session Bearer를 Learning에 전달한다")
    void createsTeam() {
        LearningCreateTeamRequest body = new LearningCreateTeamRequest(3L, "백엔드 팀");
        when(learningHttpService.createTeam(BEARER, body)).thenReturn(
                ResponseEntity.status(HttpStatus.CREATED)
                        .body(new LearningTeamResponse(10L, 3L, "백엔드 팀", CREATED_AT))
        );

        assertThat(service.create(3L, "백엔드 팀", request)).satisfies(team -> {
            assertThat(team.teamId()).isEqualTo(10L);
            assertThat(team.cohortId()).isEqualTo(3L);
            assertThat(team.name()).isEqualTo("백엔드 팀");
        });
        verify(learningHttpService).createTeam(BEARER, body);
    }

    @Test
    @DisplayName("내 팀 목록은 Learning 응답 순서와 공개 필드를 유지한다")
    void getsMyTeams() {
        when(learningHttpService.getMyTeams(BEARER)).thenReturn(ResponseEntity.ok(List.of(
                new LearningTeamResponse(10L, 3L, "3기 팀", CREATED_AT),
                new LearningTeamResponse(20L, 4L, "4기 팀", CREATED_AT.plusDays(1))
        )));

        assertThat(service.getMyTeams(request))
                .extracting("teamId", "cohortId", "name")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(10L, 3L, "3기 팀"),
                        org.assertj.core.groups.Tuple.tuple(20L, 4L, "4기 팀")
                );
    }

    @Test
    @DisplayName("팀 상세는 요청자 팀원 식별자와 역할 및 팀원 목록을 매핑한다")
    void getsTeamDetail() {
        when(learningHttpService.getTeam(BEARER, 10L)).thenReturn(ResponseEntity.ok(
                new LearningTeamDetailResponse(
                        10L,
                        3L,
                        "백엔드 팀",
                        CREATED_AT,
                        1,
                        101L,
                        "MASTER",
                        List.of(new LearningTeamMemberResponse(
                                101L, "요청자", "MASTER", CREATED_AT))
                )
        ));

        assertThat(service.getTeam(10L, request)).satisfies(team -> {
            assertThat(team.myMemberId()).isEqualTo(101L);
            assertThat(team.myRole()).isEqualTo("MASTER");
            assertThat(team.members()).singleElement().satisfies(member ->
                    assertThat(member.memberId()).isEqualTo(101L));
        });
    }

    @Test
    @DisplayName("팀원 후보 검색은 query를 바꾸지 않고 Learning에 전달한다")
    void searchesMemberCandidates() {
        UUID targetUserId = UUID.randomUUID();
        when(learningHttpService.searchTeamMemberCandidates(
                BEARER, 10L, "  student@example.com  "
        )).thenReturn(ResponseEntity.ok(List.of(
                new LearningTeamMemberCandidateResponse(
                        targetUserId,
                        "학생",
                        "student@example.com",
                        "AVAILABLE"
                )
        )));

        assertThat(service.searchMemberCandidates(
                10L, "  student@example.com  ", request
        )).singleElement().satisfies(candidate -> {
            assertThat(candidate.userId()).isEqualTo(targetUserId);
            assertThat(candidate.status()).isEqualTo("AVAILABLE");
        });
        verify(learningHttpService).searchTeamMemberCandidates(
                BEARER, 10L, "  student@example.com  ");
    }

    @Test
    @DisplayName("팀원 추가·제외·탈퇴·위임·해체 명령을 기존 Learning 계약으로 전달한다")
    void delegatesAllTeamCommands() {
        UUID targetUserId = UUID.randomUUID();
        LearningAddTeamMemberRequest addBody = new LearningAddTeamMemberRequest(targetUserId);
        when(learningHttpService.addTeamMember(BEARER, 10L, addBody))
                .thenReturn(ResponseEntity.status(HttpStatus.CREATED).build());
        when(learningHttpService.kickTeamMember(BEARER, 10L, 102L))
                .thenReturn(ResponseEntity.noContent().build());
        when(learningHttpService.leaveTeam(BEARER, 10L))
                .thenReturn(ResponseEntity.noContent().build());
        when(learningHttpService.delegateTeamMaster(BEARER, 10L, 102L))
                .thenReturn(ResponseEntity.noContent().build());
        when(learningHttpService.disbandTeam(BEARER, 10L))
                .thenReturn(ResponseEntity.noContent().build());

        service.addMember(10L, targetUserId, request);
        service.kickMember(10L, 102L, request);
        service.leave(10L, request);
        service.delegate(10L, 102L, request);
        service.disband(10L, request);

        verify(learningHttpService).addTeamMember(BEARER, 10L, addBody);
        verify(learningHttpService).kickTeamMember(BEARER, 10L, 102L);
        verify(learningHttpService).leaveTeam(BEARER, 10L);
        verify(learningHttpService).delegateTeamMaster(BEARER, 10L, 102L);
        verify(learningHttpService).disbandTeam(BEARER, 10L);
    }

    @Test
    @DisplayName("Learning 성공 Status가 팀 계약과 다르면 502 오류로 변환한다")
    void rejectsUnexpectedSuccessStatus() {
        when(learningHttpService.createTeam(
                BEARER, new LearningCreateTeamRequest(3L, "백엔드 팀")
        )).thenReturn(ResponseEntity.ok(
                new LearningTeamResponse(10L, 3L, "백엔드 팀", CREATED_AT)));

        assertThatThrownBy(() -> service.create(3L, "백엔드 팀", request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("본문이 필요한 팀 성공 응답의 Body가 없으면 502 오류로 변환한다")
    void rejectsMissingSuccessBody() {
        when(learningHttpService.getTeam(BEARER, 10L))
                .thenReturn(ResponseEntity.ok().build());

        assertThatThrownBy(() -> service.getTeam(10L, request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("Learning 팀 4xx의 Status와 오류 Code를 보존한다")
    void preservesLearningTeamError() {
        RestClientResponseException failure = new RestClientResponseException(
                "Conflict",
                HttpStatus.CONFLICT,
                "Conflict",
                new HttpHeaders(),
                new byte[0],
                StandardCharsets.UTF_8
        );
        ApiErrorResponse error = new ApiErrorResponse(
                "TEAM_DELEGATION_REQUIRED",
                "위임이 필요합니다.",
                "/api/v1/teams/10/leave",
                "learning-team-request"
        );
        failure.setBodyConvertFunction(ignored -> error);
        when(learningHttpService.leaveTeam(BEARER, 10L)).thenThrow(failure);

        assertThatThrownBy(() -> service.leave(10L, request))
                .isInstanceOfSatisfying(LearningDownstreamException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getErrorResponse().code())
                            .isEqualTo("TEAM_DELEGATION_REQUIRED");
                });
    }
}
