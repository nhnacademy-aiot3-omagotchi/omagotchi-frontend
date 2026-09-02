package site.omagotchi.frontend.study.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.http.HttpResponseContractValidator;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.study.application.result.DailyStudyRecordsView;
import site.omagotchi.frontend.study.application.result.MonthlyStudySecondsView;
import site.omagotchi.frontend.study.application.result.StudyRecordView;
import site.omagotchi.frontend.study.infrastructure.request.LearningCreateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.request.LearningUpdateStudyRecordRequest;
import site.omagotchi.frontend.study.infrastructure.response.LearningDailyStudyRecordsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningMonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStudyRecordResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudyRecordBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    public StudyRecordView getStudyRecord(
            UUID studyRecordId,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<LearningStudyRecordResponse> response = callExecutor.execute(
                () -> learningHttpService.getStudyRecord(
                        context.bearerToken(), context.cohortId(), studyRecordId)
        );
        requireStatus(response, HttpStatus.OK, "공부 기록 조회");
        return StudyResponseContracts.requireStudyRecord(
                requireBody(response, "공부 기록 조회"),
                studyRecordId,
                "공부 기록 조회"
        );
    }

    public DailyStudyRecordsView getDailyStudyRecords(
            LocalDate date,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<LearningDailyStudyRecordsResponse> response = callExecutor.execute(
                () -> learningHttpService.getDailyStudyRecords(
                        context.bearerToken(), context.cohortId(), date.toString())
        );
        requireStatus(response, HttpStatus.OK, "일별 공부 기록 조회");
        return StudyResponseContracts.requireDailyRecords(
                requireBody(response, "일별 공부 기록 조회"),
                date,
                "일별 공부 기록 조회"
        );
    }

    public MonthlyStudySecondsView getMonthlyStudyTimeSummary(
            YearMonth month,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<LearningMonthlyStudySecondsResponse> response = callExecutor.execute(
                () -> learningHttpService.getMonthlyStudyTimeSummary(
                        context.bearerToken(), context.cohortId(), month.toString())
        );
        requireStatus(response, HttpStatus.OK, "월별 공부 시간 조회");
        return StudyResponseContracts.requireMonthlySummary(
                requireBody(response, "월별 공부 시간 조회"),
                month,
                "월별 공부 시간 조회"
        );
    }

    public StudyRecordView createStudyRecord(
            LocalDateTime startDateTime,
            LocalDateTime endDateTime,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        LearningCreateStudyRecordRequest body = new LearningCreateStudyRecordRequest(
                startDateTime,
                endDateTime
        );
        ResponseEntity<LearningStudyRecordResponse> response = callExecutor.execute(
                () -> learningHttpService.createStudyRecord(
                        context.bearerToken(), context.cohortId(), body)
        );
        requireStatus(response, HttpStatus.CREATED, "공부 기록 생성");
        return StudyResponseContracts.requireStudyRecord(
                requireBody(response, "공부 기록 생성"),
                "공부 기록 생성"
        );
    }

    public StudyRecordView updateStudyRecord(
            UUID studyRecordId,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime,
            Long expectedVersion,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        LearningUpdateStudyRecordRequest body = new LearningUpdateStudyRecordRequest(
                startDateTime,
                endDateTime,
                expectedVersion
        );
        ResponseEntity<LearningStudyRecordResponse> response = callExecutor.execute(
                () -> learningHttpService.updateStudyRecord(
                        context.bearerToken(),
                        context.cohortId(),
                        studyRecordId,
                        body
                )
        );
        requireStatus(response, HttpStatus.OK, "공부 기록 수정");
        return StudyResponseContracts.requireStudyRecord(
                requireBody(response, "공부 기록 수정"),
                studyRecordId,
                "공부 기록 수정"
        );
    }

    public void deleteStudyRecord(
            UUID studyRecordId,
            Long resourceVersion,
            HttpServletRequest request
    ) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.deleteStudyRecord(
                        context.bearerToken(),
                        context.cohortId(),
                        studyRecordId,
                        resourceVersion
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "공부 기록 삭제");
    }

    private static void requireStatus(
            ResponseEntity<?> response,
            HttpStatus expectedStatus,
            String operation
    ) {
        HttpResponseContractValidator.requireStatus(response, expectedStatus, operation);
    }

    private static <T> T requireBody(ResponseEntity<T> response, String operation) {
        return HttpResponseContractValidator.requireBody(response, operation);
    }
}
