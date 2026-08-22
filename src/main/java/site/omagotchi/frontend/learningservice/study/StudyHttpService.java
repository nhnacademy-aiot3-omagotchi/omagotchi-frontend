package site.omagotchi.frontend.learningservice.study;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.PutExchange;
import site.omagotchi.frontend.learningservice.study.StudyModels.CreateStudyRecordRequest;
import site.omagotchi.frontend.learningservice.study.StudyModels.DailyStudyRecordsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MembershipResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MonthlyStudySecondsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.StudyRecordResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.TimerResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.UpdateStudyRecordRequest;

import java.util.List;
import java.util.UUID;

// Learning Service study HTTP wire contract. Browser URL과 분리된 실제 /api/v1 주소다.
@HttpExchange("/api/v1/cohorts")
public interface StudyHttpService {

    @GetExchange("/join-requests/me")
    ResponseEntity<List<MembershipResponse>> getMyMemberships(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PostExchange("/{cohortId}/timer/start")
    ResponseEntity<TimerResponse> startTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @GetExchange("/{cohortId}/timer")
    ResponseEntity<TimerResponse> getCurrentTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId
    );

    @PostExchange("/{cohortId}/timer/{timerRunId}/stop")
    ResponseEntity<Void> stopTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID timerRunId
    );

    @PostExchange("/{cohortId}/timer/{timerRunId}/discard")
    ResponseEntity<Void> discardTimer(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID timerRunId
    );

    @GetExchange("/{cohortId}/study-records/{studyRecordId}")
    ResponseEntity<StudyRecordResponse> getStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId
    );

    @GetExchange("/{cohortId}/study-records")
    ResponseEntity<DailyStudyRecordsResponse> getDailyRecords(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String date
    );

    @GetExchange("/{cohortId}/study-time-summaries")
    ResponseEntity<MonthlyStudySecondsResponse> getMonthlyStudySeconds(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestParam String month
    );

    @PostExchange("/{cohortId}/study-records")
    ResponseEntity<StudyRecordResponse> createStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @RequestBody CreateStudyRecordRequest request
    );

    @PutExchange("/{cohortId}/study-records/{studyRecordId}")
    ResponseEntity<StudyRecordResponse> updateStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId,
            @RequestBody UpdateStudyRecordRequest request
    );

    @DeleteExchange("/{cohortId}/study-records/{studyRecordId}")
    ResponseEntity<Void> deleteStudyRecord(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader("X-RESOURCE-VERSION") Long expectedVersion,
            @PathVariable Long cohortId,
            @PathVariable UUID studyRecordId
    );
}
