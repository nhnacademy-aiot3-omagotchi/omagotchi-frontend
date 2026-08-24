package site.omagotchi.frontend.learning.profile.infrastructure.response;

public record UserProfileResponse(
        String userId,
        String nickname,
        long totalStudySeconds,
        long completedSessionCount,
        int attendanceStreakDays,
        ApprovedCohortResponse approvedCohort,
        CurrentCharacterResponse currentCharacter
) {

    public UserProfileResponse withUserId(String nextUserId) {
        return new UserProfileResponse(
                nextUserId,
                nickname,
                totalStudySeconds,
                completedSessionCount,
                attendanceStreakDays,
                approvedCohort,
                currentCharacter
        );
    }
}
