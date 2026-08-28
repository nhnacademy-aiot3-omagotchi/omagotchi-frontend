package site.omagotchi.frontend.space.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.LearningVacancyAlertRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddParticipantRequest;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSpaceResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningVacancyAlertResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningParticipantCandidateResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyParticipantResponse;
import site.omagotchi.frontend.space.application.result.OccupancyView;
import site.omagotchi.frontend.space.application.result.SpaceView;
import site.omagotchi.frontend.space.application.result.VacancyAlertView;
import site.omagotchi.frontend.space.application.result.ParticipantCandidateView;
import site.omagotchi.frontend.space.application.result.OccupancyParticipantView;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpaceBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;
    private final LearningCohortContext cohortContext;

    public List<SpaceView> findAll(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        UUID userId = UUID.fromString(authorization.userId(request));
        ResponseEntity<List<LearningSpaceResponse>> response = callExecutor.execute(
                () -> learningHttpService.getSpaces(bearerToken)
        );
        requireStatus(response, HttpStatus.OK, "Space 목록 조회");
        return requireBody(response, "Space 목록 조회").stream()
                .map(item -> toView(item, userId))
                .toList();
    }

    public OccupancyView startOccupancy(
            Long spaceId,
            HttpServletRequest request
    ) {
        ResponseEntity<LearningOccupancyResponse> response = callExecutor.execute(
                () -> learningHttpService.startSpaceOccupancy(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        requireStatus(response, HttpStatus.CREATED, "회의실 점유 시작");
        return toView(requireBody(response, "회의실 점유 시작"));
    }

    public OccupancyView extendOccupancy(
            Long spaceId,
            HttpServletRequest request
    ) {
        ResponseEntity<LearningOccupancyResponse> response = callExecutor.execute(
                () -> learningHttpService.extendSpaceOccupancy(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        requireStatus(response, HttpStatus.OK, "회의실 점유 연장");
        return toView(requireBody(response, "회의실 점유 연장"));
    }

    public void releaseOccupancy(
            Long spaceId,
            HttpServletRequest request
    ) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.releaseSpaceOccupancy(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "회의실 점유 반납");
    }

    public void leaveOccupancy(
            Long spaceId,
            HttpServletRequest request
    ) {
        String bearerToken = authorization.bearerToken(request);
        UUID userId = UUID.fromString(authorization.userId(request));
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.removeSpaceOccupancyParticipant(
                        bearerToken,
                        spaceId,
                        userId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "회의실 참여 종료");
    }

    public List<ParticipantCandidateView> searchParticipantCandidates(
            Long spaceId,
            String query,
            HttpServletRequest request
    ) {
        ResponseEntity<List<LearningParticipantCandidateResponse>> response =
                callExecutor.execute(() -> learningHttpService
                        .searchSpaceOccupancyParticipantCandidates(
                                authorization.bearerToken(request), spaceId, query));
        requireStatus(response, HttpStatus.OK, "회의실 참여 후보 검색");
        return requireBody(response, "회의실 참여 후보 검색").stream()
                .map(item -> new ParticipantCandidateView(
                        item.userId(), item.displayName(), item.email(), item.status()))
                .toList();
    }

    public List<OccupancyParticipantView> getParticipants(
            Long spaceId,
            HttpServletRequest request
    ) {
        ResponseEntity<List<LearningOccupancyParticipantResponse>> response =
                callExecutor.execute(() -> learningHttpService.getSpaceOccupancyParticipants(
                        authorization.bearerToken(request), spaceId));
        requireStatus(response, HttpStatus.OK, "회의실 참여자 조회");
        return requireBody(response, "회의실 참여자 조회").stream()
                .map(item -> new OccupancyParticipantView(
                        item.userId(), item.displayName(), item.occupier()))
                .toList();
    }

    public void addParticipant(Long spaceId, UUID targetUserId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.addSpaceOccupancyParticipant(
                        authorization.bearerToken(request),
                        spaceId,
                        new LearningAddParticipantRequest(targetUserId)
                )
        );
        requireStatus(response, HttpStatus.CREATED, "회의실 참여자 추가");
    }

    public void removeParticipant(Long spaceId, UUID targetUserId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.removeSpaceOccupancyParticipant(
                        authorization.bearerToken(request), spaceId, targetUserId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "회의실 참여자 제외");
    }

    public void requestVacancyAlert(Long spaceId, HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.requestVacancyAlert(
                        context.bearerToken(), spaceId,
                        new LearningVacancyAlertRequest(context.cohortId())
                )
        );
        requireStatus(response, HttpStatus.CREATED, "공실 알림 신청");
    }

    public List<VacancyAlertView> getMyVacancyAlerts(HttpServletRequest request) {
        ResponseEntity<List<LearningVacancyAlertResponse>> response = callExecutor.execute(
                () -> learningHttpService.getMyVacancyAlerts(
                        cohortContext.bearerToken(request))
        );
        requireStatus(response, HttpStatus.OK, "공실 알림 목록 조회");
        return requireBody(response, "공실 알림 목록 조회").stream()
                .map(item -> new VacancyAlertView(
                        item.alertId(), item.spaceId(), item.cohortId(), item.createdAt()))
                .toList();
    }

    public void cancelVacancyAlert(Long alertId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.cancelVacancyAlert(
                        cohortContext.bearerToken(request), alertId)
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "공실 알림 취소");
    }

    private static SpaceView toView(LearningSpaceResponse item, UUID requesterUserId) {
        List<UUID> participants = item.participantUserIds() == null
                ? List.of()
                : item.participantUserIds();
        return new SpaceView(
                item.spaceId(),
                item.name(),
                item.type(),
                item.capacity(),
                item.operationalStatus(),
                item.inactiveReason(),
                item.cohortId(),
                item.status(),
                item.occupancyExpiresAt(),
                item.remainingTimeSeconds(),
                item.occupiedBySameCohort(),
                requesterUserId.equals(item.occupierUserId()),
                participants.contains(requesterUserId),
                item.occupiedBySameCohort() ? participants.size() : null
        );
    }

    private static OccupancyView toView(LearningOccupancyResponse response) {
        return new OccupancyView(
                response.occupancyId(),
                response.spaceId(),
                response.status(),
                response.startedAt(),
                response.expiresAt(),
                response.extensionCount(),
                response.remainingSeconds()
        );
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expected,
            String operation
    ) {
        if (response.getStatusCode().value() != expected.value()) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 Status 불일치 expected="
                            + expected.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }

    private static <T> T requireBody(ResponseEntity<T> response, String operation) {
        if (response.getBody() == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 성공 응답 Body 누락"
            );
        }
        return response.getBody();
    }
}
