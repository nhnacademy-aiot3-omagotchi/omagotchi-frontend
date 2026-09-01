package site.omagotchi.frontend.learning.series.application;

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
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.learning.series.infrastructure.SensorHttpService;
import site.omagotchi.frontend.profile.infrastructure.response.ApprovedCohortResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SeriesBffServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String BEARER = "Bearer session-access-token";
    private static final Long COHORT_ID = 3L;

    private final SensorHttpService sensorHttpService = mock(SensorHttpService.class);
    private final LearningHttpService learningHttpService = mock(LearningHttpService.class);
    private final BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
    private final LearningGatewayCallExecutor callExecutor =
            new LearningGatewayCallExecutor(mock(ApiErrorResponseDecoder.class));
    private final SeriesBffService service = new SeriesBffService(
            sensorHttpService,
            callExecutor,
            new LearningCohortContext(
                    learningHttpService,
                    callExecutor,
                    new LearningSessionAuthorization(sessionTokens))
    );

    @Test
    @DisplayName("세션 토큰과 조회 조건을 하류에 전달하고 응답을 그대로 돌려준다")
    void relaysTokenAndParamsToDownstream() {
        // given
        MockHttpServletRequest request = authenticatedRequest();
        givenApprovedCohort();
        JsonNode downstreamResponse = JsonMapper.builder().build().createObjectNode()
                .put("location", "study-room-1");
        when(sensorHttpService.getSpaceSeries(BEARER, COHORT_ID, "study-room-1", "co2", "DAY"))
                .thenReturn(downstreamResponse);

        // when
        JsonNode result = service.getSpaceSeries(request, "study-room-1", "co2", "DAY");

        // then: 하류 응답 객체가 가공 없이 그대로 반환된다
        assertThat(result).isSameAs(downstreamResponse);
        // 승인 기수가 경로에 실려 나간다 — Browser가 지정한 값이 아니다
        verify(sensorHttpService).getSpaceSeries(BEARER, COHORT_ID, "study-room-1", "co2", "DAY");
    }

    @Test
    @DisplayName("세션 토큰이 없으면 하류를 호출하기 전에 중단한다")
    void stopsBeforeDownstreamCallWhenSessionTokenIsMissing() {
        // given: 토큰을 저장하지 않은 빈 세션
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());

        try {
            service.getSpaceSeries(request, "study-room-1", "co2", "DAY");
            fail("예외가 발생해야 하는데 발생하지 않았다");
        } catch (BusinessException exception) {
            verify(sensorHttpService, never())
                    .getSpaceSeries(anyString(), anyLong(), anyString(), anyString(), anyString());
        }
    }

    /** 승인 기수가 있는 Profile을 세운다. 없으면 하류를 호출하기 전에 중단한다. */
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

    /** 로그인된 상태의 요청을 꾸민다. Presence 테스트와 같은 방식. */
    private MockHttpServletRequest authenticatedRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(new MockHttpSession());
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                USER_ID,
                GlobalRole.USER,
                "session-access-token",
                Instant.parse("2026-08-27T10:00:00Z"),
                "session-refresh-token",
                Instant.parse("2026-09-03T10:00:00Z")
        ));
        return request;
    }
}