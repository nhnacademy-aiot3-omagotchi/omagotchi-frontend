package site.omagotchi.frontend.space.application;

import org.junit.jupiter.api.BeforeEach;
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
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.LearningDeactivateSpaceRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningUpdateSpaceRequest;
import tools.jackson.databind.JsonNode;
import site.omagotchi.frontend.learning.infrastructure.response.LearningAdminActiveOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyParticipantResponse;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSpaceBffServiceTest {

    private static final String BEARER = "Bearer access-token";
    private static final LearningSpaceMutationRequest PAYLOAD =
            new LearningSpaceMutationRequest("회의실 A", "MEETING", 8, 1L);
    private static final LearningUpdateSpaceRequest UPDATE =
            new LearningUpdateSpaceRequest("회의실 A", "MEETING", 8);

    @Mock
    private LearningHttpService learningHttpService;

    private AdminSpaceBffService service;
    private MockHttpServletRequest request;
    private JsonNode body;

    @BeforeEach
    void setUp() {
        BrowserSessionTokens tokens = new BrowserSessionTokens();
        request = new MockHttpServletRequest();
        tokens.save(request, new BrowserSessionTokenBundle(
                UUID.fromString("019d2a48-80c0-4d6a-9a15-0b16d2dd74f1"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2026-08-25T06:00:00Z"),
                "refresh-token",
                Instant.parse("2026-08-26T06:00:00Z")
        ));
        service = new AdminSpaceBffService(
                learningHttpService,
                new LearningGatewayCallExecutor(new ApiErrorResponseDecoder()),
                new LearningSessionAuthorization(tokens)
        );
        body = mock(JsonNode.class);
    }

    @Test
    void relaysCreateWithSessionAccessToken() {
        when(learningHttpService.createSpace(BEARER, PAYLOAD))
                .thenReturn(ResponseEntity.status(HttpStatus.CREATED).body(body));

        assertThat(service.create(PAYLOAD, request)).isSameAs(body);

        verify(learningHttpService).createSpace(BEARER, PAYLOAD);
    }

    @Test
    void relaysUpdate() {
        when(learningHttpService.updateSpace(BEARER, 3L, UPDATE))
                .thenReturn(ResponseEntity.ok(body));

        assertThat(service.update(3L, UPDATE, request)).isSameAs(body);

        verify(learningHttpService).updateSpace(BEARER, 3L, UPDATE);
    }

    @Test
    void relaysActivation() {
        when(learningHttpService.activateSpace(BEARER, 3L))
                .thenReturn(ResponseEntity.ok(body));

        assertThat(service.activate(3L, request)).isSameAs(body);

        verify(learningHttpService).activateSpace(BEARER, 3L);
    }

    @Test
    void relaysDeactivationReason() {
        LearningDeactivateSpaceRequest reason = new LearningDeactivateSpaceRequest("정기 점검");
        when(learningHttpService.deactivateSpace(BEARER, 3L, reason))
                .thenReturn(ResponseEntity.ok(body));

        assertThat(service.deactivate(3L, "정기 점검", request)).isSameAs(body);

        verify(learningHttpService).deactivateSpace(BEARER, 3L, reason);
    }

    @Test
    void relaysDelete() {
        when(learningHttpService.deleteSpace(BEARER, 3L))
                .thenReturn(ResponseEntity.noContent().build());

        service.delete(3L, request);

        verify(learningHttpService).deleteSpace(BEARER, 3L);
    }

    @Test
    void relaysCohortAssignmentAndRemoval() {
        LearningAssignSpaceCohortRequest payload = new LearningAssignSpaceCohortRequest(1L);
        when(learningHttpService.assignSpaceCohort(BEARER, 3L, payload))
                .thenReturn(ResponseEntity.ok(body));
        when(learningHttpService.unassignSpaceCohort(BEARER, 3L))
                .thenReturn(ResponseEntity.noContent().build());

        assertThat(service.assignCohort(3L, payload, request)).isSameAs(body);
        service.unassignCohort(3L, request);

        verify(learningHttpService).assignSpaceCohort(BEARER, 3L, payload);
        verify(learningHttpService).unassignSpaceCohort(BEARER, 3L);
    }

    @Test
    void relaysAdminOccupancyQueriesAndForceRelease() {
        UUID occupierId = UUID.randomUUID();
        var occupancy = new LearningAdminActiveOccupancyResponse(
                3L, "회의실 A", 9L, occupierId, "점유자", 2,
                OffsetDateTime.parse("2026-08-28T09:00:00+09:00"),
                OffsetDateTime.parse("2026-08-28T11:00:00+09:00"), 3600L, "ACTIVE");
        var participant = new LearningOccupancyParticipantResponse(occupierId, "점유자", true);
        when(learningHttpService.getAdminActiveOccupancies(BEARER))
                .thenReturn(ResponseEntity.ok(List.of(occupancy)));
        when(learningHttpService.getSpaceOccupancyParticipants(BEARER, 3L))
                .thenReturn(ResponseEntity.ok(List.of(participant)));
        when(learningHttpService.forceReleaseSpaceOccupancy(BEARER, 3L))
                .thenReturn(ResponseEntity.noContent().build());

        assertThat(service.getActiveOccupancies(request)).containsExactly(occupancy);
        assertThat(service.getParticipants(3L, request)).containsExactly(participant);
        service.forceRelease(3L, request);

        verify(learningHttpService).getAdminActiveOccupancies(BEARER);
        verify(learningHttpService).getSpaceOccupancyParticipants(BEARER, 3L);
        verify(learningHttpService).forceReleaseSpaceOccupancy(BEARER, 3L);
    }
}
