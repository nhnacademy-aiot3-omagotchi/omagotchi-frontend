package site.omagotchi.frontend.study.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.study.application.StudyRecordBffService;
import site.omagotchi.frontend.study.presentation.request.CreateStudyRecordRequest;
import site.omagotchi.frontend.study.presentation.request.UpdateStudyRecordRequest;
import site.omagotchi.frontend.study.presentation.response.DailyStudyRecordsResponse;
import site.omagotchi.frontend.study.presentation.response.MonthlyStudySecondsResponse;
import site.omagotchi.frontend.study.presentation.response.StudyRecordResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1")
public class StudyRecordBffController {

    private static final String RESOURCE_VERSION_HEADER = "X-RESOURCE-VERSION";

    private final StudyRecordBffService studyRecordBffService;

    @GetMapping("/study-records/{study-record-id}")
    public StudyRecordResponse getStudyRecord(
            HttpServletRequest request,
            @PathVariable("study-record-id") UUID studyRecordId
    ) {
        return StudyRecordResponse.from(
                studyRecordBffService.getStudyRecord(studyRecordId, request)
        );
    }

    @GetMapping("/study-records")
    public DailyStudyRecordsResponse getDailyStudyRecords(
            HttpServletRequest request,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return DailyStudyRecordsResponse.from(
                studyRecordBffService.getDailyStudyRecords(date, request)
        );
    }

    @GetMapping("/study-time-summaries")
    public MonthlyStudySecondsResponse getMonthlyStudyTimeSummary(
            HttpServletRequest request,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return MonthlyStudySecondsResponse.from(
                studyRecordBffService.getMonthlyStudyTimeSummary(month, request)
        );
    }

    @PostMapping("/study-records")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyRecordResponse createStudyRecord(
            HttpServletRequest request,
            @Valid @RequestBody CreateStudyRecordRequest body
    ) {
        return StudyRecordResponse.from(
                studyRecordBffService.createStudyRecord(
                        body.startDateTime(),
                        body.endDateTime(),
                        request
                )
        );
    }

    @PutMapping("/study-records/{study-record-id}")
    public StudyRecordResponse updateStudyRecord(
            HttpServletRequest request,
            @PathVariable("study-record-id") UUID studyRecordId,
            @Valid @RequestBody UpdateStudyRecordRequest body
    ) {
        return StudyRecordResponse.from(
                studyRecordBffService.updateStudyRecord(
                        studyRecordId,
                        body.startDateTime(),
                        body.endDateTime(),
                        body.expectedVersion(),
                        request
                )
        );
    }

    @DeleteMapping("/study-records/{study-record-id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudyRecord(
            HttpServletRequest request,
            @RequestHeader(RESOURCE_VERSION_HEADER) Long resourceVersion,
            @PathVariable("study-record-id") UUID studyRecordId
    ) {
        studyRecordBffService.deleteStudyRecord(
                studyRecordId,
                resourceVersion,
                request
        );
    }
}
