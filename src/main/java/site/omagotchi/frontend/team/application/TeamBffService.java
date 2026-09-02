package site.omagotchi.frontend.team.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.http.HttpResponseContractValidator;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddTeamMemberRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningCreateTeamRequest;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamDetailResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamMemberCandidateResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamMemberResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningTeamResponse;
import site.omagotchi.frontend.team.application.result.TeamDetailView;
import site.omagotchi.frontend.team.application.result.TeamMemberCandidateView;
import site.omagotchi.frontend.team.application.result.TeamMemberView;
import site.omagotchi.frontend.team.application.result.TeamView;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public TeamView create(Long cohortId, String name, HttpServletRequest request) {
        ResponseEntity<LearningTeamResponse> response = callExecutor.execute(
                () -> learningHttpService.createTeam(
                        authorization.bearerToken(request),
                        new LearningCreateTeamRequest(cohortId, name)
                )
        );
        requireStatus(response, HttpStatus.CREATED, "팀 생성");
        return toView(requireBody(response, "팀 생성"));
    }

    public List<TeamView> getMyTeams(HttpServletRequest request) {
        ResponseEntity<List<LearningTeamResponse>> response = callExecutor.execute(
                () -> learningHttpService.getMyTeams(authorization.bearerToken(request))
        );
        requireStatus(response, HttpStatus.OK, "내 팀 목록 조회");
        return requireBody(response, "내 팀 목록 조회").stream()
                .map(TeamBffService::toView)
                .toList();
    }

    public TeamDetailView getTeam(Long teamId, HttpServletRequest request) {
        ResponseEntity<LearningTeamDetailResponse> response = callExecutor.execute(
                () -> learningHttpService.getTeam(
                        authorization.bearerToken(request), teamId)
        );
        requireStatus(response, HttpStatus.OK, "팀 상세 조회");
        return toDetailView(requireBody(response, "팀 상세 조회"), "팀 상세 조회");
    }

    public List<TeamMemberCandidateView> searchMemberCandidates(
            Long teamId,
            String query,
            HttpServletRequest request
    ) {
        ResponseEntity<List<LearningTeamMemberCandidateResponse>> response = callExecutor.execute(
                () -> learningHttpService.searchTeamMemberCandidates(
                        authorization.bearerToken(request), teamId, query)
        );
        requireStatus(response, HttpStatus.OK, "팀원 후보 검색");
        return requireBody(response, "팀원 후보 검색").stream()
                .map(candidate -> new TeamMemberCandidateView(
                        candidate.userId(),
                        candidate.displayName(),
                        candidate.email(),
                        candidate.status()
                ))
                .toList();
    }

    public void addMember(Long teamId, UUID targetUserId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.addTeamMember(
                        authorization.bearerToken(request),
                        teamId,
                        new LearningAddTeamMemberRequest(targetUserId)
                )
        );
        requireStatus(response, HttpStatus.CREATED, "팀원 추가");
    }

    public void kickMember(Long teamId, Long memberId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.kickTeamMember(
                        authorization.bearerToken(request), teamId, memberId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "팀원 제외");
    }

    public void leave(Long teamId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.leaveTeam(
                        authorization.bearerToken(request), teamId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "팀 탈퇴");
    }

    public void delegate(Long teamId, Long memberId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.delegateTeamMaster(
                        authorization.bearerToken(request), teamId, memberId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "팀 마스터 위임");
    }

    public void disband(Long teamId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.disbandTeam(
                        authorization.bearerToken(request), teamId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "팀 해체");
    }

    private static TeamView toView(LearningTeamResponse response) {
        return new TeamView(
                response.teamId(),
                response.cohortId(),
                response.name(),
                response.createdAt()
        );
    }

    private static TeamDetailView toDetailView(
            LearningTeamDetailResponse response,
            String operation
    ) {
        List<LearningTeamMemberResponse> members = requireField(
                response.members(), operation, "members");

        return new TeamDetailView(
                response.teamId(),
                response.cohortId(),
                response.name(),
                response.createdAt(),
                response.memberCount(),
                response.myMemberId(),
                response.myRole(),
                members.stream()
                        .map(TeamBffService::toMemberView)
                        .toList()
        );
    }

    private static TeamMemberView toMemberView(LearningTeamMemberResponse response) {
        return new TeamMemberView(
                response.memberId(),
                response.displayName(),
                response.role(),
                response.joinedAt()
        );
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expectedStatus,
            String operation
    ) {
        HttpResponseContractValidator.requireStatus(response, expectedStatus, operation);
    }

    private static <T> T requireBody(ResponseEntity<T> response, String operation) {
        return HttpResponseContractValidator.requireBody(response, operation);
    }

    private static <T> T requireField(T value, String operation, String fieldName) {
        return HttpResponseContractValidator.requireField(value, operation, fieldName);
    }
}
