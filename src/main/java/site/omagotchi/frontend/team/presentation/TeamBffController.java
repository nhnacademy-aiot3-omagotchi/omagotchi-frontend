package site.omagotchi.frontend.team.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.team.application.TeamBffService;
import site.omagotchi.frontend.team.presentation.request.AddTeamMemberRequest;
import site.omagotchi.frontend.team.presentation.request.CreateTeamRequest;
import site.omagotchi.frontend.team.presentation.response.TeamDetailResponse;
import site.omagotchi.frontend.team.presentation.response.TeamMemberCandidateResponse;
import site.omagotchi.frontend.team.presentation.response.TeamResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/teams")
public class TeamBffController {

    private final TeamBffService teamBffService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(
            @Valid @RequestBody CreateTeamRequest body,
            HttpServletRequest request
    ) {
        return TeamResponse.from(teamBffService.create(body.cohortId(), body.name(), request));
    }

    @GetMapping("/me")
    public List<TeamResponse> getMyTeams(HttpServletRequest request) {
        return teamBffService.getMyTeams(request).stream()
                .map(TeamResponse::from)
                .toList();
    }

    @GetMapping("/{teamId}")
    public TeamDetailResponse getTeam(
            @PathVariable Long teamId,
            HttpServletRequest request
    ) {
        return TeamDetailResponse.from(teamBffService.getTeam(teamId, request));
    }

    @GetMapping("/{teamId}/member-candidates")
    public List<TeamMemberCandidateResponse> searchMemberCandidates(
            @PathVariable Long teamId,
            @RequestParam String query,
            HttpServletRequest request
    ) {
        return teamBffService.searchMemberCandidates(teamId, query, request).stream()
                .map(TeamMemberCandidateResponse::from)
                .toList();
    }

    @PostMapping("/{teamId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public void addMember(
            @PathVariable Long teamId,
            @Valid @RequestBody AddTeamMemberRequest body,
            HttpServletRequest request
    ) {
        teamBffService.addMember(teamId, body.targetUserId(), request);
    }

    @DeleteMapping("/{teamId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void kickMember(
            @PathVariable Long teamId,
            @PathVariable Long memberId,
            HttpServletRequest request
    ) {
        teamBffService.kickMember(teamId, memberId, request);
    }

    @PostMapping("/{teamId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable Long teamId, HttpServletRequest request) {
        teamBffService.leave(teamId, request);
    }

    @PostMapping("/{teamId}/members/{memberId}/delegate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delegate(
            @PathVariable Long teamId,
            @PathVariable Long memberId,
            HttpServletRequest request
    ) {
        teamBffService.delegate(teamId, memberId, request);
    }

    @DeleteMapping("/{teamId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disband(@PathVariable Long teamId, HttpServletRequest request) {
        teamBffService.disband(teamId, request);
    }
}
