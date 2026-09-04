package site.omagotchi.frontend.space.application;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.profile.infrastructure.response.ApprovedCohortResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;
import site.omagotchi.frontend.space.application.port.SpaceEnvironmentClient;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SpaceEnvironmentBffServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String BEARER = "Bearer session-access-token";
    private static final Long COHORT_ID = 3L;
    private static final Instant MEASURED_AT = Instant.parse("2026-09-04T10:25:00Z");

    private final SpaceEnvironmentClient spaceEnvironmentClient = mock(SpaceEnvironmentClient.class);
    private final LearningHttpService learningHttpService = mock(LearningHttpService.class);
    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final SpaceEnvironmentBffService service = new SpaceEnvironmentBffService(
            spaceEnvironmentClient,
            new LearningCohortContext(
                    learningHttpService,
                    new LearningGatewayCallExecutor(mock(ApiErrorResponseDecoder.class)),
                    new LearningSessionAuthorization(sessionTokens))
    );

    @Test
    @DisplayName("승인 기수와 세션 토큰을 실어 조회하고 결과를 그대로 돌려준다")
    void relaysCohortEnvironments() {
        // given
        MockHttpServletRequest request = authenticatedRequest();
        givenApprovedCohort();
        List<SpaceEnvironmentView> downstream = List.of(
                new SpaceEnvironmentView(101L, 612.4, 23.4, 48.0, MEASURED_AT, 2),
                // 센서가 없는 공간도 목록에 남아 온다 — 화면이 "센서 없음"으로 그린다
                new SpaceEnvironmentView(102L, null, null, null, null, 0)
        );
        when(spaceEnvironmentClient.findByCohort(BEARER, COHORT_ID)).thenReturn(downstream);

        // when
        List<SpaceEnvironmentView> views = service.findMyCohortEnvironments(request);

        // then: 가공하지 않는다 — 값의 판정은 하류가 한다
        assertThat(views).isEqualTo(downstream);
        // 기수는 Browser 가 아니라 Profile 에서 온 값이 실려 나간다
        verify(spaceEnvironmentClient).findByCohort(BEARER, COHORT_ID);
    }

    @Test
    @DisplayName("승인 기수가 없으면 조회하지 않는다")
    void stopsWhenApprovedCohortIsMissing() {
        MockHttpServletRequest request = authenticatedRequest();
        when(learningHttpService.getMyProfile(any())).thenReturn(new UserProfileResponse(
                USER_ID.toString(), "학생", 0L, 0L, 0, null, null));

        assertThatThrownBy(() -> service.findMyCohortEnvironments(request))
                .isInstanceOf(BusinessException.class);

        verify(spaceEnvironmentClient, never()).findByCohort(anyString(), anyLong());
    }

    @Test
    @DisplayName("세션 토큰이 없으면 조회하기 전에 중단한다")
    void stopsBeforeLookupWhenSessionTokenIsMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());

        assertThatThrownBy(() -> service.findMyCohortEnvironments(request))
                .isInstanceOf(BusinessException.class);

        verify(spaceEnvironmentClient, never()).findByCohort(anyString(), anyLong());
    }

    /** 승인 기수가 있는 Profile 을 세운다. 없으면 하류를 호출하기 전에 중단한다. */
    private void givenApprovedCohort() {
        when(learningHttpService.getMyProfile(any())).thenReturn(new UserProfileResponse(
                USER_ID.toString(),
                "학생",
                0L,
                0L,
                0,
                new ApprovedCohortResponse(COHORT_ID, "3기", null, null,
                        "ACTIVE", "STUDENT", "ACTIVE"),
                null
        ));
    }

    private MockHttpServletRequest authenticatedRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                USER_ID,
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2026-08-27T10:00:00Z"),
                "session-refresh-token",
                Instant.parse("2026-09-11T10:00:00Z")
        ));
        return request;
    }
}
