package site.omagotchi.frontend.learning.infrastructure.response;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserProfileResponseTest {

    @Test
    void returnsCopyWithAuthenticatedSessionUserId() {
        UserProfileResponse downstreamProfile = new UserProfileResponse(
                null,
                "오마고치",
                120L,
                2L,
                1,
                null,
                null
        );

        UserProfileResponse response = downstreamProfile.withUserId(
                "00000000-0000-0000-0000-000000000001"
        );

        assertThat(response.userId())
                .isEqualTo("00000000-0000-0000-0000-000000000001");
        assertThat(response.nickname()).isEqualTo("오마고치");
    }
}
