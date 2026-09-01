package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.account.infrastructure.request.LearningAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.response.LearningUserManagedCohortsResponse;

import java.util.List;
import java.util.UUID;

/** Learning Service의 기수 관리자 조회·변경 계약. */
@HttpExchange("/api/v1/cohorts")
public interface LearningCohortManagerHttpService {

    @PostExchange("/managers/search")
    ResponseEntity<List<LearningUserManagedCohortsResponse>> searchManagedCohorts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody LearningCohortManagerSearchRequest request
    );

    @PostExchange("/{cohort-id}/managers")
    ResponseEntity<Void> assignManager(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody LearningAssignCohortManagerRequest request
    );

    @PatchExchange("/{cohort-id}/members/{user-id}/role")
    ResponseEntity<Void> changeMemberRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("user-id") UUID userId,
            @RequestBody LearningChangeCohortMemberRoleRequest request
    );
}
