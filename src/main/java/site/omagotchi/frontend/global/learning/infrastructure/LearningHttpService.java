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
import site.omagotchi.frontend.profile.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.profile.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;
import site.omagotchi.frontend.cohort.infrastructure.response.UserAccessContextResponse;

import java.util.List;
import java.util.UUID;

@HttpExchange("/api/v1")
public interface LearningHttpService {

    @GetExchange("/cohorts/me/access-context")
    UserAccessContextResponse getMyAccessContext(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/user-profiles/me/profile")
    UserProfileResponse getMyProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PatchExchange("/user-profiles/me/nickname")
    UserNicknameResponse updateMyNickname(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody UpdateNicknameRequest request
    );

    @GetExchange("/telegram/link")
    JsonNode getMyTelegramLink(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PostExchange("/telegram/link-token")
    JsonNode issueTelegramLinkToken(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PatchExchange("/telegram/link/notification")
    JsonNode updateTelegramNotification(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @DeleteExchange("/telegram/link")
    JsonNode disconnectTelegram(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @GetExchange("/cohorts")
    JsonNode getCohorts(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @GetExchange("/cohorts/{cohort-id}")
    JsonNode getCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
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
    @PostExchange("/gamification/quests/{user-daily-quest-id}/claim")
    JsonNode claimQuest(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("user-daily-quest-id") Long userDailyQuestId
    );

    // aggregationDate는 Learning에서 선택 값이다. View가 더 엄격하면 정상 요청을 막는다.
    @GetExchange("/gamification/progression")
    JsonNode getProgression(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam Long cohortId,
            @RequestParam(required = false) String aggregationDate
    );

    @GetExchange("/cohorts/{cohort-id}/study-rankings/today")
    JsonNode getTodayStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohort-id}/study-rankings/daily/{date}")
    JsonNode getDailyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable String date,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohort-id}/study-rankings/weekly/{week-start-date}")
    JsonNode getWeeklyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("week-start-date") String weekStartDate,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohort-id}/study-rankings/monthly/{month}")
    JsonNode getMonthlyStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable String month,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohort-id}/study-records/{study-record-id}")
    JsonNode getStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("study-record-id") UUID studyRecordId
    );

    @GetExchange("/cohorts/{cohort-id}/study-records")
    JsonNode getDailyStudyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String date
    );

    @GetExchange("/cohorts/{cohort-id}/study-time-summaries")
    JsonNode getMonthlyStudyTimeSummary(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String month
    );

    @PostExchange("/cohorts/{cohort-id}/study-records")
    ResponseEntity<JsonNode> createStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @PutExchange("/cohorts/{cohort-id}/study-records/{study-record-id}")
    JsonNode updateStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("study-record-id") UUID studyRecordId,
            @RequestBody JsonNode request
    );

    @DeleteExchange("/cohorts/{cohort-id}/study-records/{study-record-id}")
    ResponseEntity<Void> deleteStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("study-record-id") UUID studyRecordId,
            @RequestHeader("X-RESOURCE-VERSION") Long resourceVersion
    );

    @GetExchange("/cohorts/{cohort-id}/timer")
    JsonNode getCurrentTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/timer/start")
    ResponseEntity<JsonNode> startTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/timer/{timer-run-id}/stop")
    ResponseEntity<Void> stopTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("timer-run-id") UUID timerRunId
    );

    @PostExchange("/cohorts/{cohort-id}/timer/{timer-run-id}/discard")
    ResponseEntity<Void> discardTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("timer-run-id") UUID timerRunId
    );

    @GetExchange("/community/posts")
    JsonNode getCommunityPosts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam int page,
            @RequestParam int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search
    );

    @GetExchange("/community/posts/{post-id}")
    JsonNode getCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId
    );

    @GetExchange("/community/posts/{post-id}/attachments/{attachment-id}")
    ResponseEntity<Resource> downloadCommunityAttachment(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId,
            @PathVariable("attachment-id") Long attachmentId
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

    @PatchExchange(value = "/community/posts/{post-id}", contentType = MediaType.APPLICATION_JSON_VALUE)
    JsonNode updateCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId,
            @RequestBody JsonNode request
    );

    @PatchExchange(value = "/community/posts/{post-id}", contentType = MediaType.MULTIPART_FORM_DATA_VALUE)
    JsonNode updateCommunityPostMultipart(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) List<HttpEntity<Resource>> attachments
    );

    @DeleteExchange("/community/posts/{post-id}")
    ResponseEntity<Void> deleteCommunityPost(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId
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

    @PatchExchange("/cohorts/{cohort-id}")
    JsonNode updateCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohort-id}/status")
    JsonNode updateCohortStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @DeleteExchange("/cohorts/{cohort-id}")
    ResponseEntity<Void> deleteCohort(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @GetExchange("/cohorts/{cohort-id}/members")
    JsonNode getCohortMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @GetExchange("/cohorts/{cohort-id}/join-requests")
    JsonNode getCohortApplications(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/managers")
    JsonNode addCohortManager(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohort-id}/members/{member-user-id}/role")
    JsonNode updateMemberRole(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("member-user-id") String userId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohort-memberships/{membership-id}/approve")
    JsonNode approveMembership(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("membership-id") Long membershipId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohort-memberships/{membership-id}/reject")
    JsonNode rejectMembership(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("membership-id") Long membershipId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohort-id}/join-code")
    JsonNode getJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PostExchange("/cohorts/{cohort-id}/join-code")
    JsonNode createJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/cohorts/{cohort-id}/join-code/revoke")
    JsonNode revokeJoinCode(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @GetExchange("/cohorts/{cohort-id}/attendance-policy")
    JsonNode getAttendancePolicy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @PutExchange("/cohorts/{cohort-id}/attendance-policy")
    JsonNode updateAttendancePolicy(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohort-id}/attendance-records")
    JsonNode getAttendanceRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String date,
            @RequestParam Integer page,
            @RequestParam Integer size
    );

    @PatchExchange("/cohorts/{cohort-id}/attendance-records/{attendance-id}/status")
    ResponseEntity<Void> updateAttendanceStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("attendance-id") Long attendanceRecordId,
            @RequestBody JsonNode request
    );

    @PatchExchange("/community/posts/{post-id}/pin")
    JsonNode updateCommunityPostPin(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("post-id") Long postId,
            @RequestBody JsonNode request
    );

    @GetExchange("/cohorts/{cohort-id}/study-statistics/today")
    JsonNode getStudyStatisticsToday(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );

    @GetExchange("/cohorts/{cohort-id}/study-statistics/trend")
    JsonNode getStudyStatisticsTrend(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String window
    );

    @GetExchange("/cohorts/{cohort-id}/study-statistics/members")
    JsonNode getStudyStatisticsMembers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String window,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    );

    @GetExchange("/cohorts/{cohort-id}/study-statistics/members/{cohort-membership-id}/overview")
    JsonNode getStudyStatisticsMemberOverview(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("cohort-membership-id") Long cohortMembershipId,
            @RequestParam String window
    );

    @GetExchange("/cohorts/{cohort-id}/study-statistics/members/{cohort-membership-id}/records")
    JsonNode getStudyStatisticsMemberDailyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("cohort-membership-id") Long cohortMembershipId,
            @RequestParam String date
    );
}
