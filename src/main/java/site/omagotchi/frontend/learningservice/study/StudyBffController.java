package site.omagotchi.frontend.learningservice.study;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learningservice.common.LearningSessionAccessTokenProvider;
import site.omagotchi.frontend.learningservice.study.StudyModels.CreateStudyRecordRequest;
import site.omagotchi.frontend.learningservice.study.StudyModels.DailyStudyRecordsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MembershipResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MonthlyStudySecondsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.StudyRecordResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.TimerResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.UpdateStudyRecordRequest;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/learning")
public class StudyBffController {

    private final StudyBffService service;
    private final LearningSessionAccessTokenProvider accessTokenProvider;

    @GetMapping("/cohort-memberships/me")
    public List<MembershipResponse> getMyMemberships(HttpServletRequest request) {
        return service.getMyMemberships(accessTokenProvider.require(request));
    }

    @PostMapping("/cohorts/{cohortId}/timer/start")
    public ResponseEntity<TimerResponse> startTimer(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.startTimer(accessTokenProvider.require(request), cohortId));
    }

    @GetMapping("/cohorts/{cohortId}/timer")
    public TimerResponse getCurrentTimer(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId
    ) {
        return service.getCurrentTimer(accessTokenProvider.require(request), cohortId);
    }

    @PostMapping("/cohorts/{cohortId}/timer/{timerRunId}/stop")
    public ResponseEntity<Void> stopTimer(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable UUID timerRunId
    ) {
        service.stopTimer(accessTokenProvider.require(request), cohortId, timerRunId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cohorts/{cohortId}/timer/{timerRunId}/discard")
    public ResponseEntity<Void> discardTimer(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable UUID timerRunId
    ) {
        service.discardTimer(accessTokenProvider.require(request), cohortId, timerRunId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cohorts/{cohortId}/study-records/{studyRecordId}")
    public StudyRecordResponse getStudyRecord(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable UUID studyRecordId
    ) {
        return service.getStudyRecord(
                accessTokenProvider.require(request), cohortId, studyRecordId
        );
    }

    @GetMapping("/cohorts/{cohortId}/study-records")
    public DailyStudyRecordsResponse getDailyRecords(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return service.getDailyRecords(accessTokenProvider.require(request), cohortId, date);
    }

    @GetMapping("/cohorts/{cohortId}/study-time-summaries")
    public MonthlyStudySecondsResponse getMonthlyStudySeconds(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @RequestParam @DateTimeFormat(pattern = "uuuu-MM") YearMonth month
    ) {
        return service.getMonthlyStudySeconds(
                accessTokenProvider.require(request), cohortId, month
        );
    }

    @PostMapping("/cohorts/{cohortId}/study-records")
    public ResponseEntity<StudyRecordResponse> createStudyRecord(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @Valid @RequestBody CreateStudyRecordRequest body
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createStudyRecord(
                        accessTokenProvider.require(request), cohortId, body
                ));
    }

    @PutMapping("/cohorts/{cohortId}/study-records/{studyRecordId}")
    public StudyRecordResponse updateStudyRecord(
            HttpServletRequest request,
            @PathVariable @Positive Long cohortId,
            @PathVariable UUID studyRecordId,
            @Valid @RequestBody UpdateStudyRecordRequest body
    ) {
        return service.updateStudyRecord(
                accessTokenProvider.require(request), cohortId, studyRecordId, body
        );
    }

    @DeleteMapping("/cohorts/{cohortId}/study-records/{studyRecordId}")
    public ResponseEntity<Void> deleteStudyRecord(
            HttpServletRequest request,
            @RequestHeader("X-RESOURCE-VERSION") @PositiveOrZero Long expectedVersion,
            @PathVariable @Positive Long cohortId,
            @PathVariable UUID studyRecordId
    ) {
        service.deleteStudyRecord(
                accessTokenProvider.require(request), cohortId, studyRecordId, expectedVersion
        );
        return ResponseEntity.noContent().build();
    }
}
