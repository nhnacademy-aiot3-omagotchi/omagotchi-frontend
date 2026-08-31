package site.omagotchi.frontend.cohort.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin")
public class AdminCohortBffController {

    private final LearningProxyBffService proxy;
    private final ManagerJoinCodeSessionStore joinCodeSessionStore;

    @GetMapping("/cohorts")
    public JsonNode getCohorts(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getAdminCohortSummaries(context.bearerToken()));
    }

    @PostMapping("/cohorts")
    public JsonNode createCohort(HttpServletRequest request, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service()
                .createCohort(context.bearerToken(), body));
    }

    @PatchMapping("/cohorts/{cohort-id}")
    public JsonNode updateCohort(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCohort(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/cohorts/{cohort-id}/status")
    public JsonNode updateCohortStatus(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCohortStatus(context.bearerToken(), cohortId, body));
    }

    @DeleteMapping("/cohorts/{cohort-id}")
    public ResponseEntity<Void> deleteCohort(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        proxy.execute(request, context -> context.service()
                .deleteCohort(context.bearerToken(), cohortId));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cohorts/{cohort-id}/members")
    public JsonNode getMembers(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        return proxy.execute(request, context -> context.service()
                .getCohortMembers(context.bearerToken(), cohortId));
    }

    @GetMapping("/cohorts/{cohort-id}/applications")
    public JsonNode getApplications(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        return proxy.execute(request, context -> context.service()
                .getCohortApplications(context.bearerToken(), cohortId));
    }

    @PostMapping("/cohorts/{cohort-id}/managers")
    public JsonNode addManager(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .addCohortManager(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/cohorts/{cohort-id}/members/{member-user-id}/role")
    public JsonNode updateMemberRole(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("member-user-id") String userId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateMemberRole(context.bearerToken(), cohortId, userId, body));
    }

    @PatchMapping("/memberships/{membership-id}/approve")
    public JsonNode approveMembership(
            HttpServletRequest request,
            @PathVariable("membership-id") Long membershipId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .approveMembership(context.bearerToken(), membershipId, body));
    }

    @PatchMapping("/memberships/{membership-id}/reject")
    public JsonNode rejectMembership(
            HttpServletRequest request,
            @PathVariable("membership-id") Long membershipId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .rejectMembership(context.bearerToken(), membershipId, body));
    }

    @GetMapping("/cohorts/{cohort-id}/join-code")
    public JsonNode getJoinCode(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        JsonNode metadata = proxy.execute(request, context -> context.service()
                .getJoinCode(context.bearerToken(), cohortId));
        return joinCodeSessionStore.restore(request, cohortId, metadata);
    }

    @PostMapping("/cohorts/{cohort-id}/join-code")
    public JsonNode createJoinCode(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        JsonNode issued = proxy.execute(request, context -> context.service()
                .createJoinCode(context.bearerToken(), cohortId, body));
        joinCodeSessionStore.save(request, cohortId, issued);
        return issued;
    }

    @PatchMapping("/cohorts/{cohort-id}/join-code/revoke")
    public JsonNode revokeJoinCode(HttpServletRequest request, @PathVariable("cohort-id") Long cohortId) {
        JsonNode revoked = proxy.execute(request, context -> context.service()
                .revokeJoinCode(context.bearerToken(), cohortId));
        joinCodeSessionStore.remove(request, cohortId);
        return revoked;
    }
}
