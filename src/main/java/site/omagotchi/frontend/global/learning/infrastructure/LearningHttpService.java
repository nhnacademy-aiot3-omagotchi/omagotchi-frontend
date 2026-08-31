package site.omagotchi.frontend.global.learning.infrastructure;

import tools.jackson.databind.JsonNode;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.PutExchange;
import org.springframework.web.bind.annotation.RequestPart;
import site.omagotchi.frontend.learning.infrastructure.request.LearningDeactivateSpaceRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningUpdateSpaceRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningVacancyAlertRequest;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAddParticipantRequest;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningAdminActiveOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSpaceResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningVacancyAlertResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningParticipantCandidateResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyParticipantResponse;
import site.omagotchi.frontend.profile.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.profile.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;

import java.util.List;
import java.util.UUID;

@HttpExchange("/api/v1")
public interface LearningHttpService {

    @GetExchange("/user-profiles/me/profile")
    UserProfileResponse getMyProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PatchExchange("/user-profiles/me/nickname")
    UserNicknameResponse updateMyNickname(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody UpdateNicknameRequest request
    );

    @GetExchange("/cohorts")
    JsonNode getCohorts(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @GetExchange("/cohorts/{cohortId}")
    JsonNode getCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/applications")
    JsonNode applyToCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/join-requests/me")
    JsonNode getMyCohortApplications(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/gamification/characters")
    JsonNode getCharacters(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @PostExchange("/gamification/characters/representative")
    JsonNode createRepresentativeCharacter(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @GetExchange("/gamification/home")
    JsonNode getGamificationHome(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/gamification/quests/daily")
    JsonNode getDailyQuests(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    // Learning 계약은 Quest 정의 ID가 아니라 사용자별 일일 Quest 인스턴스 ID를 받는다.
    @PostExchange("/gamification/quests/{userDailyQuestId}/claim")
    JsonNode claimQuest(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long userDailyQuestId
    );

    // aggregationDate는 Learning에서 선택 값이다. View가 더 엄격하면 정상 요청을 막는다.
    @GetExchange("/gamification/progression")
    JsonNode getProgression(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam Long cohortId,
            @RequestParam(required = false) String aggregationDate
    );

    @GetExchange("/cohorts/{cohortId}/study-rankings/today")
    JsonNode getTodayStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohortId}/study-rankings/daily/{date}")
    JsonNode getDailyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String date,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohortId}/study-rankings/weekly/{weekStartDate}")
    JsonNode getWeeklyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String weekStartDate,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohortId}/study-rankings/monthly/{month}")
    JsonNode getMonthlyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String month,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohortId}/study-records/{studyRecordId}")
    JsonNode getStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId
    );

    @GetExchange("/cohorts/{cohortId}/study-records")
    JsonNode getDailyStudyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String date
    );

    @GetExchange("/cohorts/{cohortId}/study-time-summaries")
    JsonNode getMonthlyStudyTimeSummary(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String month
    );

    @PostExchange("/cohorts/{cohortId}/study-records")
    ResponseEntity<JsonNode> createStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @PutExchange("/cohorts/{cohortId}/study-records/{studyRecordId}")
    JsonNode updateStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId,
            @RequestBody JsonNode request
    );

    @DeleteExchange("/cohorts/{cohortId}/study-records/{studyRecordId}")
    ResponseEntity<Void> deleteStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId,
            @RequestHeader("X-RESOURCE-VERSION") Long resourceVersion
    );

    @GetExchange("/cohorts/{cohortId}/timer")
    JsonNode getCurrentTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/{cohortId}/timer/start")
    ResponseEntity<JsonNode> startTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/{cohortId}/timer/{timerRunId}/stop")
    ResponseEntity<Void> stopTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID timerRunId
    );

    @PostExchange("/cohorts/{cohortId}/timer/{timerRunId}/discard")
    ResponseEntity<Void> discardTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID timerRunId
    );

    @GetExchange("/community/posts")
    JsonNode getCommunityPosts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam int page,
            @RequestParam int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search
    );

    @GetExchange("/community/posts/{postId}")
    JsonNode getCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId
    );

    @GetExchange("/community/posts/{postId}/attachments/{attachmentId}")
    ResponseEntity<Resource> downloadCommunityAttachment(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId,
            @PathVariable Long attachmentId
    );

    @PostExchange(value = "/community/posts", contentType = MediaType.APPLICATION_JSON_VALUE)
    JsonNode createCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @PostExchange(value = "/community/posts", contentType = MediaType.MULTIPART_FORM_DATA_VALUE)
    JsonNode createCommunityPostMultipart(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) List<HttpEntity<Resource>> attachments
    );

    @PatchExchange(value = "/community/posts/{postId}", contentType = MediaType.APPLICATION_JSON_VALUE)
    JsonNode updateCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId,
            @RequestBody JsonNode request
    );

    @PatchExchange(value = "/community/posts/{postId}", contentType = MediaType.MULTIPART_FORM_DATA_VALUE)
    JsonNode updateCommunityPostMultipart(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) List<HttpEntity<Resource>> attachments
    );

    @DeleteExchange("/community/posts/{postId}")
    ResponseEntity<Void> deleteCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId
    );

    @PostExchange("/cohorts")
    JsonNode createCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/admin-summary")
    JsonNode getAdminCohortSummaries(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PatchExchange("/cohorts/{cohortId}")
    JsonNode updateCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohortId}/status")
    JsonNode updateCohortStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @DeleteExchange("/cohorts/{cohortId}")
    ResponseEntity<Void> deleteCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/cohorts/{cohortId}/members")
    JsonNode getCohortMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/cohorts/{cohortId}/join-requests")
    JsonNode getCohortApplications(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/{cohortId}/managers")
    JsonNode addCohortManager(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohortId}/members/{userId}/role")
    JsonNode updateMemberRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable String userId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohort-memberships/{membershipId}/approve")
    JsonNode approveMembership(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long membershipId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohort-memberships/{membershipId}/reject")
    JsonNode rejectMembership(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long membershipId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohortId}/join-code")
    JsonNode getJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/cohorts/{cohortId}/join-code")
    JsonNode createJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohortId}/join-code/revoke")
    JsonNode revokeJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/cohorts/{cohortId}/attendance-policy")
    JsonNode getAttendancePolicy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PutExchange("/cohorts/{cohortId}/attendance-policy")
    JsonNode updateAttendancePolicy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohortId}/attendance-records")
    JsonNode getAttendanceRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String date,
            @RequestParam Integer page,
            @RequestParam Integer size
    );

    @PatchExchange("/cohorts/{cohortId}/attendance-records/{attendanceRecordId}/status")
    ResponseEntity<Void> updateAttendanceStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long attendanceRecordId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/community/posts/{postId}/pin")
    JsonNode updateCommunityPostPin(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohortId}/study-statistics/today")
    JsonNode getStudyStatisticsToday(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/cohorts/{cohortId}/study-statistics/trend")
    JsonNode getStudyStatisticsTrend(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String window
    );

    @GetExchange("/cohorts/{cohortId}/study-statistics/members")
    JsonNode getStudyStatisticsMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String window,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    );

    @GetExchange("/cohorts/{cohortId}/study-statistics/members/{cohortMembershipId}/overview")
    JsonNode getStudyStatisticsMemberOverview(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long cohortMembershipId,
            @RequestParam String window
    );

    @GetExchange("/cohorts/{cohortId}/study-statistics/members/{cohortMembershipId}/records")
    JsonNode getStudyStatisticsMemberDailyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable Long cohortMembershipId,
            @RequestParam String date);
    @GetExchange("/spaces")
    ResponseEntity<List<LearningSpaceResponse>> getSpaces(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PostExchange("/spaces/{spaceId}/occupancies")
    ResponseEntity<LearningOccupancyResponse> startSpaceOccupancy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @PostExchange("/spaces/{spaceId}/occupancies/extend")
    ResponseEntity<LearningOccupancyResponse> extendSpaceOccupancy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @PostExchange("/spaces/{spaceId}/occupancies/release")
    ResponseEntity<Void> releaseSpaceOccupancy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @DeleteExchange("/spaces/{spaceId}/occupancies/participants/{userId}")
    ResponseEntity<Void> removeSpaceOccupancyParticipant(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @PathVariable UUID userId
    );

    @GetExchange("/spaces/{spaceId}/occupancies/participants")
    ResponseEntity<List<LearningOccupancyParticipantResponse>> getSpaceOccupancyParticipants(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @GetExchange("/spaces/{spaceId}/occupancies/participants/candidates")
    ResponseEntity<List<LearningParticipantCandidateResponse>> searchSpaceOccupancyParticipantCandidates(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestParam String query
    );

    @PostExchange("/spaces/{spaceId}/occupancies/participants")
    ResponseEntity<Void> addSpaceOccupancyParticipant(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestBody LearningAddParticipantRequest request
    );

    @PostExchange("/spaces/{spaceId}/vacancy-alerts")
    ResponseEntity<Void> requestVacancyAlert(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestBody LearningVacancyAlertRequest request
    );

    @GetExchange("/vacancy-alerts/me")
    ResponseEntity<List<LearningVacancyAlertResponse>>
    getMyVacancyAlerts(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @DeleteExchange("/vacancy-alerts/{alertId}")
    ResponseEntity<Void> cancelVacancyAlert(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long alertId
    );

    @PostExchange("/admin/spaces")
    ResponseEntity<JsonNode> createSpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody LearningSpaceMutationRequest request
    );

    @GetExchange("/admin/spaces/occupancies")
    ResponseEntity<List<LearningAdminActiveOccupancyResponse>> getAdminActiveOccupancies(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PostExchange("/spaces/{spaceId}/occupancies/force-release")
    ResponseEntity<Void> forceReleaseSpaceOccupancy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @PutExchange("/admin/spaces/{spaceId}")
    ResponseEntity<JsonNode> updateSpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestBody LearningUpdateSpaceRequest request
    );

    @PostExchange("/admin/spaces/{spaceId}/activate")
    ResponseEntity<JsonNode> activateSpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @PostExchange("/admin/spaces/{spaceId}/deactivate")
    ResponseEntity<JsonNode> deactivateSpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestBody LearningDeactivateSpaceRequest request
    );

    @DeleteExchange("/admin/spaces/{spaceId}")
    ResponseEntity<Void> deleteSpace(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );

    @PutExchange("/admin/spaces/{spaceId}/cohort")
    ResponseEntity<JsonNode> assignSpaceCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestBody LearningAssignSpaceCohortRequest request
    );

    @DeleteExchange("/admin/spaces/{spaceId}/cohort")
    ResponseEntity<Void> unassignSpaceCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId
    );
}
