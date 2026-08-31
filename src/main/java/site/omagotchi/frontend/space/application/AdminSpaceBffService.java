package site.omagotchi.frontend.space.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
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
import site.omagotchi.frontend.space.presentation.response.AdminActiveOccupancyResponse;
import site.omagotchi.frontend.space.presentation.response.OccupancyParticipantResponse;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminSpaceBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public List<AdminActiveOccupancyResponse> getActiveOccupancies(
            HttpServletRequest request
    ) {
        ResponseEntity<List<LearningAdminActiveOccupancyResponse>> response = callExecutor.execute(
                () -> learningHttpService.getAdminActiveOccupancies(
                        authorization.bearerToken(request)));
        requireStatus(response, HttpStatus.OK, "관리자 활성 점유 조회");
        if (response.getBody() == null) {
            throw invalidResponse("관리자 활성 점유 조회 성공 응답 Body 누락");
        }
        return response.getBody().stream()
                .map(occupancy -> new AdminActiveOccupancyResponse(
                        occupancy.spaceId(), occupancy.spaceName(), occupancy.occupancyId(),
                        occupancy.occupierUserId(), occupancy.occupierDisplayName(), occupancy.participantCount(),
                        occupancy.startedAt(), occupancy.expiresAt(), occupancy.remainingTimeSeconds(), occupancy.status()))
                .toList();
    }

    public List<OccupancyParticipantResponse> getParticipants(
            Long spaceId,
            HttpServletRequest request
    ) {
        ResponseEntity<List<LearningOccupancyParticipantResponse>> response = callExecutor.execute(
                () -> learningHttpService.getSpaceOccupancyParticipants(
                        authorization.bearerToken(request), spaceId));
        requireStatus(response, HttpStatus.OK, "관리자 참여자 조회");
        if (response.getBody() == null) {
            throw invalidResponse("관리자 참여자 조회 성공 응답 Body 누락");
        }
        return response.getBody().stream()
                .map(participant -> new OccupancyParticipantResponse(
                        participant.userId(), participant.displayName(), participant.occupier()))
                .toList();
    }

    public void forceRelease(Long spaceId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.forceReleaseSpaceOccupancy(
                        authorization.bearerToken(request), spaceId));
        requireStatus(response, HttpStatus.NO_CONTENT, "점유 강제 종료");
    }

    public JsonNode create(
            LearningSpaceMutationRequest payload,
            HttpServletRequest request
    ) {
        ResponseEntity<JsonNode> response = callExecutor.execute(
                () -> learningHttpService.createSpace(
                        authorization.bearerToken(request),
                        payload
                )
        );
        return requireBody(response, HttpStatus.CREATED, "공간 생성");
    }

    public JsonNode update(
            Long spaceId,
            LearningUpdateSpaceRequest payload,
            HttpServletRequest request
    ) {
        ResponseEntity<JsonNode> response = callExecutor.execute(
                () -> learningHttpService.updateSpace(
                        authorization.bearerToken(request),
                        spaceId,
                        payload
                )
        );
        return requireBody(response, HttpStatus.OK, "공간 수정");
    }

    public JsonNode activate(Long spaceId, HttpServletRequest request) {
        ResponseEntity<JsonNode> response = callExecutor.execute(
                () -> learningHttpService.activateSpace(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        return requireBody(response, HttpStatus.OK, "공간 활성화");
    }

    public JsonNode deactivate(
            Long spaceId,
            String inactiveReason,
            HttpServletRequest request
    ) {
        ResponseEntity<JsonNode> response = callExecutor.execute(
                () -> learningHttpService.deactivateSpace(
                        authorization.bearerToken(request),
                        spaceId,
                        new LearningDeactivateSpaceRequest(inactiveReason)
                )
        );
        return requireBody(response, HttpStatus.OK, "공간 비활성화");
    }

    public void delete(Long spaceId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.deleteSpace(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "공간 삭제");
    }

    public JsonNode assignCohort(
            Long spaceId,
            LearningAssignSpaceCohortRequest payload,
            HttpServletRequest request
    ) {
        ResponseEntity<JsonNode> response = callExecutor.execute(
                () -> learningHttpService.assignSpaceCohort(
                        authorization.bearerToken(request),
                        spaceId,
                        payload
                )
        );
        return requireBody(response, HttpStatus.OK, "공간 기수 배정");
    }

    public void unassignCohort(Long spaceId, HttpServletRequest request) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.unassignSpaceCohort(
                        authorization.bearerToken(request),
                        spaceId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "공간 기수 배정 해제");
    }

    private static JsonNode requireBody(
            ResponseEntity<JsonNode> response,
            HttpStatus expected,
            String operation
    ) {
        requireStatus(response, expected, operation);
        if (response.getBody() == null) {
            throw invalidResponse(operation + " 성공 응답 Body 누락");
        }
        return response.getBody();
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expected,
            String operation
    ) {
        if (response.getStatusCode().value() != expected.value()) {
            throw invalidResponse(
                    operation + " 성공 응답 Status 불일치 expected="
                            + expected.value()
                            + ", actual=" + response.getStatusCode().value()
            );
        }
    }

    private static BusinessException invalidResponse(String message) {
        return new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE, message);
    }
}
