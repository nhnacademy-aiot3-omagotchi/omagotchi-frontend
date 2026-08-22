package site.omagotchi.frontend.learningservice.study;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport;
import site.omagotchi.frontend.learningservice.common.LearningServiceErrorCode;
import site.omagotchi.frontend.learningservice.study.StudyModels.CreateStudyRecordRequest;
import site.omagotchi.frontend.learningservice.study.StudyModels.DailyStudyRecordsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MembershipResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.MonthlyStudySecondsResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.StudyRecordResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.TimerResponse;
import site.omagotchi.frontend.learningservice.study.StudyModels.UpdateStudyRecordRequest;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static site.omagotchi.frontend.learningservice.common.LearningServiceClientSupport.invalidResponse;

@Service
@RequiredArgsConstructor
public class StudyBffService {

    private final StudyHttpService httpService;
    private final LearningServiceClientSupport support;

    public List<MembershipResponse> getMyMemberships(String accessToken) {
        List<MembershipResponse> response = support.body(
                () -> httpService.getMyMemberships(support.authorization(accessToken)),
                HttpStatus.OK,
                "Study memberships",
                commonErrors()
        );
        validateMemberships(response);
        return response;
    }

    public TimerResponse startTimer(String accessToken, Long cohortId) {
        TimerResponse response = support.body(
                () -> httpService.startTimer(support.authorization(accessToken), cohortId),
                HttpStatus.CREATED,
                "Study timer start",
                studyErrors()
        );
        validateTimer(response, true);
        return response;
    }

    public TimerResponse getCurrentTimer(String accessToken, Long cohortId) {
        TimerResponse response = support.body(
                () -> httpService.getCurrentTimer(support.authorization(accessToken), cohortId),
                HttpStatus.OK,
                "Study timer current",
                studyErrors()
        );
        validateTimer(response, false);
        return response;
    }

    public void stopTimer(String accessToken, Long cohortId, UUID timerRunId) {
        support.empty(
                () -> httpService.stopTimer(support.authorization(accessToken), cohortId, timerRunId),
                HttpStatus.NO_CONTENT,
                "Study timer stop",
                studyErrors()
        );
    }

    public void discardTimer(String accessToken, Long cohortId, UUID timerRunId) {
        support.empty(
                () -> httpService.discardTimer(support.authorization(accessToken), cohortId, timerRunId),
                HttpStatus.NO_CONTENT,
                "Study timer discard",
                studyErrors()
        );
    }

    public StudyRecordResponse getStudyRecord(
            String accessToken,
            Long cohortId,
            UUID studyRecordId
    ) {
        StudyRecordResponse response = support.body(
                () -> httpService.getStudyRecord(
                        support.authorization(accessToken), cohortId, studyRecordId
                ),
                HttpStatus.OK,
                "Study record get",
                studyErrors()
        );
        validateRecord(response);
        return response;
    }

    public DailyStudyRecordsResponse getDailyRecords(
            String accessToken,
            Long cohortId,
            LocalDate date
    ) {
        DailyStudyRecordsResponse response = support.body(
                () -> httpService.getDailyRecords(
                        support.authorization(accessToken), cohortId, date.toString()
                ),
                HttpStatus.OK,
                "Study records daily",
                studyErrors()
        );
        validateDaily(response, date);
        return response;
    }

    public MonthlyStudySecondsResponse getMonthlyStudySeconds(
            String accessToken,
            Long cohortId,
            YearMonth month
    ) {
        MonthlyStudySecondsResponse response = support.body(
                () -> httpService.getMonthlyStudySeconds(
                        support.authorization(accessToken), cohortId, month.toString()
                ),
                HttpStatus.OK,
                "Study summaries monthly",
                studyErrors()
        );
        validateMonthly(response, month);
        return response;
    }

    public StudyRecordResponse createStudyRecord(
            String accessToken,
            Long cohortId,
            CreateStudyRecordRequest request
    ) {
        StudyRecordResponse response = support.body(
                () -> httpService.createStudyRecord(
                        support.authorization(accessToken), cohortId, request
                ),
                HttpStatus.CREATED,
                "Study record create",
                studyErrors()
        );
        validateRecord(response);
        return response;
    }

    public StudyRecordResponse updateStudyRecord(
            String accessToken,
            Long cohortId,
            UUID studyRecordId,
            UpdateStudyRecordRequest request
    ) {
        StudyRecordResponse response = support.body(
                () -> httpService.updateStudyRecord(
                        support.authorization(accessToken), cohortId, studyRecordId, request
                ),
                HttpStatus.OK,
                "Study record update",
                studyErrors()
        );
        validateRecord(response);
        if (!studyRecordId.equals(response.id())) {
            throw invalidResponse("Study record update ID 불일치");
        }
        return response;
    }

    public void deleteStudyRecord(
            String accessToken,
            Long cohortId,
            UUID studyRecordId,
            Long expectedVersion
    ) {
        support.empty(
                () -> httpService.deleteStudyRecord(
                        support.authorization(accessToken), expectedVersion, cohortId, studyRecordId
                ),
                HttpStatus.NO_CONTENT,
                "Study record delete",
                studyErrors()
        );
    }

    private static void validateMemberships(List<MembershipResponse> memberships) {
        Set<Long> ids = new HashSet<>();
        for (MembershipResponse membership : memberships) {
            if (membership == null
                    || membership.id() == null || membership.id() <= 0
                    || !ids.add(membership.id())
                    || membership.cohortId() == null || membership.cohortId() <= 0
                    || membership.userId() == null
                    || !StringUtils.hasText(membership.role())
                    || !StringUtils.hasText(membership.status())) {
                throw invalidResponse("Study memberships 계약 불일치");
            }
        }
    }

    private static void validateTimer(TimerResponse response, boolean started) {
        if (!StringUtils.hasText(response.state())
                || response.elapsedSeconds() == null
                || response.elapsedSeconds() < 0
                || (started && (!"TIMER_STARTED".equals(response.resultCode())
                || response.timerRunId() == null
                || response.startedAt() == null))) {
            throw invalidResponse("Study timer 응답 계약 불일치");
        }
    }

    private static void validateRecord(StudyRecordResponse record) {
        if (record == null
                || record.id() == null
                || record.aggregationDate() == null
                || record.startTime() == null
                || record.endTime() == null
                || !record.startTime().isBefore(record.endTime())
                || record.studySeconds() == null || record.studySeconds() < 0
                || record.version() == null || record.version() < 0
                || record.createdAt() == null
                || record.updatedAt() == null) {
            throw invalidResponse("Study record 응답 계약 불일치");
        }
    }

    private static void validateDaily(DailyStudyRecordsResponse response, LocalDate date) {
        if (!date.equals(response.aggregationDate())
                || response.totalStudySeconds() == null || response.totalStudySeconds() < 0
                || response.records() == null) {
            throw invalidResponse("Study daily records 응답 계약 불일치");
        }
        long total = 0;
        Set<UUID> ids = new HashSet<>();
        for (StudyRecordResponse record : response.records()) {
            validateRecord(record);
            if (!date.equals(record.aggregationDate()) || !ids.add(record.id())) {
                throw invalidResponse("Study daily record 항목 계약 불일치");
            }
            total = safeAdd(total, record.studySeconds(), "Study daily records");
        }
        if (total != response.totalStudySeconds()) {
            throw invalidResponse("Study daily records 합계 불일치");
        }
    }

    private static void validateMonthly(MonthlyStudySecondsResponse response, YearMonth month) {
        if (!month.equals(response.aggregationMonth())
                || response.totalStudySeconds() == null || response.totalStudySeconds() < 0
                || response.dailyTotals() == null) {
            throw invalidResponse("Study monthly summary 응답 계약 불일치");
        }
        long total = 0;
        Set<LocalDate> dates = new HashSet<>();
        for (StudyModels.DailyStudySecondsResponse daily : response.dailyTotals()) {
            if (daily == null || daily.aggregationDate() == null
                    || !month.equals(YearMonth.from(daily.aggregationDate()))
                    || !dates.add(daily.aggregationDate())
                    || daily.studySeconds() == null || daily.studySeconds() < 0) {
                throw invalidResponse("Study monthly daily total 계약 불일치");
            }
            total = safeAdd(total, daily.studySeconds(), "Study monthly summary");
        }
        if (total != response.totalStudySeconds()) {
            throw invalidResponse("Study monthly summary 합계 불일치");
        }
    }

    private static ErrorCode[] commonErrors() {
        return new ErrorCode[]{
                CommonErrorCode.INVALID_REQUEST,
                LearningServiceErrorCode.COHORT_ACCESS_DENIED,
                LearningServiceErrorCode.COHORT_NOT_FOUND,
                LearningServiceErrorCode.MEMBERSHIP_NOT_FOUND
        };
    }

    private static long safeAdd(long left, long right, String operation) {
        try {
            return Math.addExact(left, right);
        } catch (ArithmeticException exception) {
            throw invalidResponse(operation + " 합계 overflow");
        }
    }

    private static ErrorCode[] studyErrors() {
        return new ErrorCode[]{
                CommonErrorCode.INVALID_REQUEST,
                LearningServiceErrorCode.COHORT_ACCESS_DENIED,
                LearningServiceErrorCode.COHORT_NOT_FOUND,
                LearningServiceErrorCode.MEMBERSHIP_NOT_FOUND,
                LearningServiceErrorCode.STUDY_RECORD_NOT_FOUND,
                LearningServiceErrorCode.STUDY_RECORD_OVERLAP,
                LearningServiceErrorCode.STUDY_RECORD_AGGREGATION_BOUNDARY_CROSSED,
                LearningServiceErrorCode.STUDY_RECORD_ACTIVE_TIMER_CONFLICT,
                LearningServiceErrorCode.STUDY_RECORD_VERSION_CONFLICT,
                LearningServiceErrorCode.STUDY_RECORD_WRITE_LOCK_TIMEOUT,
                LearningServiceErrorCode.TIMER_ALREADY_RUNNING,
                LearningServiceErrorCode.TIMER_RUN_NOT_FOUND,
                LearningServiceErrorCode.TIMER_ALREADY_ENDED
        };
    }
}
