package site.omagotchi.frontend.learning.infrastructure.response;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class UserProfileResponseTest {

    @Test
    void returnsCopyWithAuthenticatedSessionUserId() {
        ApprovedCohortResponse approvedCohort = new ApprovedCohortResponse(
                3L,
                "AIoT 3기",
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 12, 31),
                "ACTIVE",
                "STUDENT",
                "APPROVED"
        );
        CurrentCharacterResponse currentCharacter = new CurrentCharacterResponse(
                "공부왕",
                4,
                80L,
                120L,
                "스터디 오마고치",
                "study",
                "original",
                "study/study"
        );
        UserProfileResponse downstreamProfile = new UserProfileResponse(
                null,
                "오마고치",
                120L,
                2L,
                1,
                approvedCohort,
                currentCharacter
        );

        UserProfileResponse response = downstreamProfile.withUserId(
                "00000000-0000-0000-0000-000000000001"
        );

        assertThat(response.userId())
                .isEqualTo("00000000-0000-0000-0000-000000000001");
        assertThat(response.nickname()).isEqualTo("오마고치");
        assertThat(response.totalStudySeconds()).isEqualTo(120L);
        assertThat(response.completedSessionCount()).isEqualTo(2L);
        assertThat(response.attendanceStreakDays()).isEqualTo(1);
        assertThat(response.approvedCohort()).isSameAs(approvedCohort);
        assertThat(response.currentCharacter()).isSameAs(currentCharacter);
    }
}
