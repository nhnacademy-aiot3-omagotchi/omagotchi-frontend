package site.omagotchi.frontend.learning.infrastructure.response;

public record UserProfileResponse(
        String nickname,
        long totalStudySeconds,
        long completedSessionCount,
        int attendanceStreakDays,
        ApprovedCohortResponse approvedCohort,
        CurrentCharacterResponse currentCharacter
) {
}
