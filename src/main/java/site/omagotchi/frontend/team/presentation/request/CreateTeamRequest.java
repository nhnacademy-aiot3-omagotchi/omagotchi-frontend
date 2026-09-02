package site.omagotchi.frontend.team.presentation.request;

/** 이름 규칙과 기수 접근 권한은 Learning Service가 최종 판정한다. */
public record CreateTeamRequest(
        Long cohortId,
        String name
) {
}
