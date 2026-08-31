package site.omagotchi.frontend.account.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.account.infrastructure.request.GatewayAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.response.GatewayAdminAccountPageResponse;
import site.omagotchi.frontend.account.infrastructure.response.GatewayUserManagedCohortsResponse;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.UUID;

/** Gateway를 경유하는 시스템 관리자 계정 목록 조회 계약. */
@HttpExchange("/api/v1")
public interface AdminAccountGatewayHttpService {

    @GetExchange("/admin/users")
    GatewayAdminAccountPageResponse getUsers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    );

    @PostExchange("/cohorts/managers/search")
    List<GatewayUserManagedCohortsResponse> searchManagedCohorts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody GatewayCohortManagerSearchRequest request
    );

    @PostExchange("/cohorts/{cohort-id}/managers")
    JsonNode assignManager(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody GatewayAssignCohortManagerRequest request
    );

    @PatchExchange("/cohorts/{cohort-id}/members/{user-id}/role")
    JsonNode changeMemberRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("user-id") UUID userId,
            @RequestBody GatewayChangeCohortMemberRoleRequest request
    );
}
