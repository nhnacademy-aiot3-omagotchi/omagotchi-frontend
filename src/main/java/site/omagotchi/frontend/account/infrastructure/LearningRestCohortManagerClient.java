package site.omagotchi.frontend.account.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.port.LearningCohortManagerClient;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.account.infrastructure.request.LearningAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.response.LearningManagedCohortResponse;
import site.omagotchi.frontend.account.infrastructure.response.LearningUserManagedCohortsResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.HttpResponseContractValidator;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LearningRestCohortManagerClient implements LearningCohortManagerClient {

    private final LearningCohortManagerHttpService httpService;
    private final RestClientCallExecutor callExecutor;
    private final ApiErrorContractResolver errorResolver;

    @Override
    public Map<UUID, List<AdminManagedCohort>> findManagedCohorts(
            String accessToken,
            List<UUID> accountIds
    ) {
        ResponseEntity<List<LearningUserManagedCohortsResponse>> response = callExecutor.execute(
                () -> httpService.searchManagedCohorts(
                        "Bearer " + accessToken,
                        new LearningCohortManagerSearchRequest(accountIds)
                ),
                exception -> {
                    throw searchError(exception);
                }
        );
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "Learning 기수 관리자 조회"
        );
        List<LearningUserManagedCohortsResponse> body = response.getBody();
        requireValidResponse(body);

        try {
            return body.stream().collect(Collectors.toUnmodifiableMap(
                    LearningUserManagedCohortsResponse::userId,
                    item -> item.cohorts().stream()
                            .map(LearningRestCohortManagerClient::toManagedCohort)
                            .toList()
            ));
        } catch (IllegalStateException duplicateUser) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 기수 관리자 사용자 중복",
                    duplicateUser
            );
        }
    }

    @Override
    public void assignManager(String accessToken, UUID userId, Long cohortId) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.assignManager(
                        "Bearer " + accessToken,
                        cohortId,
                        new LearningAssignCohortManagerRequest(userId)
                ),
                exception -> {
                    throw assignmentError(exception);
                }
        );
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "Learning 기수 관리자 지정"
        );
    }

    @Override
    public void removeManager(String accessToken, UUID userId, Long cohortId) {
        ResponseEntity<Void> response = callExecutor.execute(
                () -> httpService.changeMemberRole(
                        "Bearer " + accessToken,
                        cohortId,
                        userId,
                        new LearningChangeCohortMemberRoleRequest("STUDENT")
                ),
                exception -> {
                    throw removalError(exception);
                }
        );
        HttpResponseContractValidator.requireStatus(
                response,
                HttpStatus.OK,
                "Learning 기수 관리자 해제"
        );
    }

    private static void requireValidResponse(List<LearningUserManagedCohortsResponse> response) {
        if (response == null
                || response.stream().anyMatch(item -> item == null
                        || item.userId() == null
                        || item.cohorts() == null)) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 기수 관리자 응답 누락"
            );
        }
    }

    private static AdminManagedCohort toManagedCohort(LearningManagedCohortResponse cohort) {
        if (cohort == null
                || cohort.cohortId() == null
                || cohort.cohortName() == null
                || cohort.cohortName().isBlank()
                || cohort.role() == null
                || cohort.role().isBlank()) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "Learning 기수 관리자 상세 응답 누락"
            );
        }
        return new AdminManagedCohort(cohort.cohortId(), cohort.cohortName(), cohort.role());
    }

    private BusinessException searchError(RestClientResponseException exception) {
        return new BusinessException(errorResolver.resolve(
                exception,
                SecurityErrorCode.AUTHENTICATION_REQUIRED,
                SecurityErrorCode.ACCESS_DENIED,
                CommonErrorCode.INVALID_REQUEST,
                AdminAccountErrorCode.SYSTEM_ADMIN_REQUIRED
        ), exception);
    }

    private BusinessException assignmentError(RestClientResponseException exception) {
        return new BusinessException(errorResolver.resolve(
                exception,
                SecurityErrorCode.AUTHENTICATION_REQUIRED,
                SecurityErrorCode.ACCESS_DENIED,
                CommonErrorCode.INVALID_REQUEST,
                AdminAccountErrorCode.SYSTEM_ADMIN_REQUIRED,
                AdminAccountErrorCode.INVALID_MEMBERSHIP_STATUS_TRANSITION,
                AdminAccountErrorCode.COHORT_NOT_FOUND,
                AdminAccountErrorCode.COHORT_MEMBERSHIP_NOT_FOUND,
                AdminAccountErrorCode.COHORT_ALREADY_CLOSED,
                AdminAccountErrorCode.COHORT_MANAGER_PERIOD_CONFLICT
        ), exception);
    }

    private BusinessException removalError(RestClientResponseException exception) {
        return new BusinessException(errorResolver.resolve(
                exception,
                SecurityErrorCode.AUTHENTICATION_REQUIRED,
                SecurityErrorCode.ACCESS_DENIED,
                CommonErrorCode.INVALID_REQUEST,
                AdminAccountErrorCode.SYSTEM_ADMIN_REQUIRED,
                AdminAccountErrorCode.INVALID_MEMBERSHIP_STATUS_TRANSITION,
                AdminAccountErrorCode.COHORT_NOT_FOUND,
                AdminAccountErrorCode.COHORT_MEMBERSHIP_NOT_FOUND,
                AdminAccountErrorCode.COHORT_ALREADY_CLOSED,
                AdminAccountErrorCode.COHORT_ACTIVE_MANAGER_REQUIRED
        ), exception);
    }

}
