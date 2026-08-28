package site.omagotchi.frontend.space.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionTokens;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSpaceResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningVacancyAlertResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningParticipantCandidateResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyParticipantResponse;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddParticipantRequest;
import site.omagotchi.frontend.space.application.result.SpaceView;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpaceBffServiceTest {

    private static final UUID USER_ID = UUID.fromString(
            "019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"
    );
    private static final String BEARER = "Bearer access-token";

    @Mock
    private LearningHttpService learningHttpService;
    @Mock
    private LearningCohortContext cohortContext;

    private SpaceBffService service;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        BrowserSessionTokens sessionTokens = new BrowserSessionTokens();
        request = new MockHttpServletRequest();
        sessionTokens.save(request, new BrowserSessionTokenBundle(
                USER_ID,
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-18T15:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-25T15:00:00Z")
        ));
        service = new SpaceBffService(
                learningHttpService,
                new LearningGatewayCallExecutor(new ApiErrorResponseDecoder()),
                new LearningSessionAuthorization(sessionTokens),
                cohortContext
        );
    }

    @Test
    @DisplayName("공간 목록은 Session 사용자 기준의 공개 상태만 계산")
    void mapsRequesterSpecificSpaceState() {
        when(learningHttpService.getSpaces(BEARER)).thenReturn(ResponseEntity.ok(List.of(
                new LearningSpaceResponse(
                        1L,
                        "회의실 A",
                        "MEETING",
                        8,
                        "ACTIVE",
                        null,
                        null,
                        "OCCUPIED",
                        OffsetDateTime.parse("2026-08-18T15:00:00+09:00"),
                        1200L,
                        true,
                        11L,
                        31L,
                        USER_ID,
                        List.of(USER_ID)
                )
        )));

        List<SpaceView> result = service.findAll(request);

        assertThat(result).singleElement().satisfies(space -> {
            assertThat(space.occupiedByRequester()).isTrue();
            assertThat(space.participatingByRequester()).isTrue();
            assertThat(space.participantCount()).isEqualTo(1);
        });
    }

    @Test
    @DisplayName("본인 참여 종료는 Browser 입력 없이 Session 사용자 UUID를 전달")
    void leavesWithSessionUserId() {
        when(learningHttpService.removeSpaceOccupancyParticipant(
                BEARER,
                3L,
                USER_ID
        )).thenReturn(ResponseEntity.noContent().build());

        service.leaveOccupancy(3L, request);

        verify(learningHttpService).removeSpaceOccupancyParticipant(
                BEARER,
                3L,
                USER_ID
        );
    }

    @Test
    @DisplayName("참여 후보 검색은 Session Bearer와 검색어를 Learning에 전달")
    void searchesParticipantCandidates() {
        when(learningHttpService.searchSpaceOccupancyParticipantCandidates(
                BEARER, 3L, "사용자"
        )).thenReturn(ResponseEntity.ok(List.of(
                new LearningParticipantCandidateResponse(
                        USER_ID, "사용자", "user@example.com", "AVAILABLE")
        )));

        assertThat(service.searchParticipantCandidates(3L, "사용자", request))
                .singleElement().satisfies(candidate -> {
                    assertThat(candidate.userId()).isEqualTo(USER_ID);
                    assertThat(candidate.email()).isEqualTo("user@example.com");
                    assertThat(candidate.status()).isEqualTo("AVAILABLE");
                });
    }

    @Test
    @DisplayName("현재 참여자 상세 목록을 Learning 응답에서 매핑")
    void getsParticipants() {
        when(learningHttpService.getSpaceOccupancyParticipants(BEARER, 3L))
                .thenReturn(ResponseEntity.ok(List.of(
                        new LearningOccupancyParticipantResponse(USER_ID, "사용자", true)
                )));

        assertThat(service.getParticipants(3L, request)).singleElement().satisfies(participant -> {
            assertThat(participant.displayName()).isEqualTo("사용자");
            assertThat(participant.occupier()).isTrue();
        });
    }

    @Test
    @DisplayName("참여자 추가는 targetUserId와 Session Bearer를 전달")
    void addsParticipant() {
        UUID targetUserId = UUID.randomUUID();
        when(learningHttpService.addSpaceOccupancyParticipant(
                BEARER, 3L, new LearningAddParticipantRequest(targetUserId)
        )).thenReturn(ResponseEntity.status(HttpStatus.CREATED).build());

        service.addParticipant(3L, targetUserId, request);

        verify(learningHttpService).addSpaceOccupancyParticipant(
                BEARER, 3L, new LearningAddParticipantRequest(targetUserId));
    }

    @Test
    @DisplayName("점유자의 대상 참여자 제외는 대상 UUID를 Learning에 전달")
    void removesParticipant() {
        UUID targetUserId = UUID.randomUUID();
        when(learningHttpService.removeSpaceOccupancyParticipant(BEARER, 3L, targetUserId))
                .thenReturn(ResponseEntity.noContent().build());

        service.removeParticipant(3L, targetUserId, request);

        verify(learningHttpService).removeSpaceOccupancyParticipant(BEARER, 3L, targetUserId);
    }

    @Test
    @DisplayName("성공 응답 Status가 Learning 계약과 다르면 502")
    void rejectsUnexpectedSuccessStatus() {
        when(learningHttpService.startSpaceOccupancy(BEARER, 3L))
                .thenReturn(ResponseEntity.ok(occupancy()));

        assertThatThrownBy(() -> service.startOccupancy(3L, request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("본문이 필요한 성공 응답의 Body가 없으면 502")
    void rejectsMissingSuccessBody() {
        when(learningHttpService.extendSpaceOccupancy(BEARER, 3L))
                .thenReturn(ResponseEntity.status(HttpStatus.OK).build());

        assertThatThrownBy(() -> service.extendOccupancy(3L, request))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("공실 알림 신청은 승인 기수와 Session Bearer token을 전달")
    void requestsVacancyAlertWithResolvedCohort() {
        when(cohortContext.resolve(request))
                .thenReturn(new LearningCohortContext.Resolved(BEARER, 7L));
        when(learningHttpService.requestVacancyAlert(
                org.mockito.ArgumentMatchers.eq(BEARER),
                org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.argThat(body -> body.cohortId().equals(7L))
        )).thenReturn(ResponseEntity.status(HttpStatus.CREATED).build());

        service.requestVacancyAlert(3L, request);

        verify(learningHttpService).requestVacancyAlert(
                org.mockito.ArgumentMatchers.eq(BEARER),
                org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.argThat(body -> body.cohortId().equals(7L))
        );
    }

    @Test
    @DisplayName("내 공실 알림 목록은 Learning 응답 계약을 그대로 매핑")
    void getsMyVacancyAlerts() {
        when(cohortContext.bearerToken(request)).thenReturn(BEARER);
        when(learningHttpService.getMyVacancyAlerts(BEARER)).thenReturn(ResponseEntity.ok(List.of(
                new LearningVacancyAlertResponse(
                        41L, 3L, 7L,
                        OffsetDateTime.parse("2026-08-27T10:00:00+09:00"))
        )));

        assertThat(service.getMyVacancyAlerts(request)).singleElement().satisfies(alert -> {
            assertThat(alert.alertId()).isEqualTo(41L);
            assertThat(alert.spaceId()).isEqualTo(3L);
            assertThat(alert.cohortId()).isEqualTo(7L);
        });
    }

    @Test
    @DisplayName("공실 알림 취소는 alertId와 Session Bearer token을 전달")
    void cancelsVacancyAlert() {
        when(cohortContext.bearerToken(request)).thenReturn(BEARER);
        when(learningHttpService.cancelVacancyAlert(BEARER, 41L))
                .thenReturn(ResponseEntity.noContent().build());

        service.cancelVacancyAlert(41L, request);

        verify(learningHttpService).cancelVacancyAlert(BEARER, 41L);
    }

    @Test
    @DisplayName("공실 알림 Learning 호출 오류를 숨기지 않음")
    void propagatesVacancyAlertDownstreamFailure() {
        RuntimeException failure = new RuntimeException("downstream failure");
        when(cohortContext.bearerToken(request)).thenReturn(BEARER);
        when(learningHttpService.getMyVacancyAlerts(BEARER)).thenThrow(failure);

        assertThatThrownBy(() -> service.getMyVacancyAlerts(request)).isSameAs(failure);
    }

    private static LearningOccupancyResponse occupancy() {
        return new LearningOccupancyResponse(
                9L,
                3L,
                "ACTIVE",
                OffsetDateTime.parse("2026-08-18T14:00:00+09:00"),
                OffsetDateTime.parse("2026-08-18T16:00:00+09:00"),
                0,
                7200L
        );
    }
}
