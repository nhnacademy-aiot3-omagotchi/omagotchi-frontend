package site.omagotchi.frontend.learning.admin.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin")
public class AdminLearningBffController {

    private final LearningProxyBffService proxy;

    @PostMapping("/cohorts")
    public JsonNode createCohort(HttpServletRequest request, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().createCohort(context.bearerToken(), body));
    }

    @PatchMapping("/cohorts/{cohortId}")
    public JsonNode updateCohort(HttpServletRequest request, @PathVariable Long cohortId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().updateCohort(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/cohorts/{cohortId}/status")
    public JsonNode updateCohortStatus(HttpServletRequest request, @PathVariable Long cohortId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().updateCohortStatus(context.bearerToken(), cohortId, body));
    }

    @GetMapping("/cohorts/{cohortId}/members")
    public JsonNode getMembers(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service().getCohortMembers(context.bearerToken(), cohortId));
    }

    @GetMapping("/cohorts/{cohortId}/applications")
    public JsonNode getApplications(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service().getCohortApplications(context.bearerToken(), cohortId));
    }

    @PostMapping("/cohorts/{cohortId}/managers")
    public JsonNode addManager(HttpServletRequest request, @PathVariable Long cohortId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().addCohortManager(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/cohorts/{cohortId}/members/{userId}/role")
    public JsonNode updateMemberRole(HttpServletRequest request, @PathVariable Long cohortId, @PathVariable String userId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().updateMemberRole(context.bearerToken(), cohortId, userId, body));
    }

    @PatchMapping("/memberships/{membershipId}/approve")
    public JsonNode approveMembership(HttpServletRequest request, @PathVariable Long membershipId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().approveMembership(context.bearerToken(), membershipId, body));
    }

    @PatchMapping("/memberships/{membershipId}/reject")
    public JsonNode rejectMembership(HttpServletRequest request, @PathVariable Long membershipId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().rejectMembership(context.bearerToken(), membershipId, body));
    }

    @GetMapping("/cohorts/{cohortId}/join-code")
    public JsonNode getJoinCode(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service().getJoinCode(context.bearerToken(), cohortId));
    }

    @PostMapping("/cohorts/{cohortId}/join-code")
    public JsonNode createJoinCode(HttpServletRequest request, @PathVariable Long cohortId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().createJoinCode(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/cohorts/{cohortId}/join-code/revoke")
    public JsonNode revokeJoinCode(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service().revokeJoinCode(context.bearerToken(), cohortId));
    }

    @GetMapping("/cohorts/{cohortId}/attendance-policy")
    public JsonNode getAttendancePolicy(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service().getAttendancePolicy(context.bearerToken(), cohortId));
    }

    @PutMapping("/cohorts/{cohortId}/attendance-policy")
    public JsonNode updateAttendancePolicy(HttpServletRequest request, @PathVariable Long cohortId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().updateAttendancePolicy(context.bearerToken(), cohortId, body));
    }

    @GetMapping("/cohorts/{cohortId}/attendance-records")
    public JsonNode getAttendanceRecords(
            HttpServletRequest request,
            @PathVariable Long cohortId,
            @RequestParam String date,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "100") Integer size
    ) {
        return proxy.execute(request, context -> context.service().getAttendanceRecords(
                context.bearerToken(), cohortId, date, page, size
        ));
    }

    @PatchMapping("/cohorts/{cohortId}/attendance-records/{attendanceRecordId}/status")
    public ResponseEntity<Void> updateAttendanceStatus(HttpServletRequest request, @PathVariable Long cohortId, @PathVariable Long attendanceRecordId, @RequestBody JsonNode body) {
        proxy.execute(request, context -> context.service().updateAttendanceStatus(context.bearerToken(), cohortId, attendanceRecordId, body));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cohorts/{cohortId}/study-rankings")
    public JsonNode getStudyRankings(HttpServletRequest request, @PathVariable Long cohortId, @RequestParam(defaultValue = "WEEKLY") String period, @RequestParam(defaultValue = "100") Integer maxRank) {
        return proxy.execute(request, context -> context.service().getManagedStudyRankings(context.bearerToken(), cohortId, period, maxRank));
    }

    @PatchMapping("/community/posts/{postId}/pin")
    public JsonNode updatePostPin(HttpServletRequest request, @PathVariable Long postId, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().updateCommunityPostPin(context.bearerToken(), postId, body));
    }
}
