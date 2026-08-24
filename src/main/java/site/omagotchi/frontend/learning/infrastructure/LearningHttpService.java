package site.omagotchi.frontend.learning.infrastructure;

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
import site.omagotchi.frontend.learning.ranking.domain.StudyRankingPeriod;
import site.omagotchi.frontend.learning.profile.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.learning.profile.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.learning.profile.infrastructure.response.UserProfileResponse;

import java.util.List;

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

    // period는 Learning에서 Enum이므로 View도 Enum으로 고정한다. maxRank는 선택 값이다.
    @GetExchange("/cohorts/{cohortId}/study-rankings")
    JsonNode getStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam StudyRankingPeriod period,
            @RequestParam(required = false) Integer maxRank
    );

    @GetExchange("/cohorts/{cohortId}/study-rankings/me")
    JsonNode getMyStudyRanking(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam StudyRankingPeriod period
    );

    @GetExchange("/cohorts/me/presence")
    JsonNode getPresence(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

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

    @GetExchange("/cohorts/{cohortId}/study-rankings/management")
    JsonNode getManagedStudyRankings(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String period,
            @RequestParam Integer maxRank
    );

    @PatchExchange("/community/posts/{postId}/pin")
    JsonNode updateCommunityPostPin(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long postId,
            @RequestBody JsonNode request
    );
}
