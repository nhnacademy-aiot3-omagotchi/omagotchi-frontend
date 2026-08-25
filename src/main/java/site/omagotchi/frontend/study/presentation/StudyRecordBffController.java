package site.omagotchi.frontend.study.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1")
public class StudyRecordBffController {

    private static final String RESOURCE_VERSION_HEADER = "X-RESOURCE-VERSION";

    private final LearningProxyBffService proxy;

    @GetMapping("/study-records/{studyRecordId}")
    public JsonNode getStudyRecord(
            HttpServletRequest request,
            @PathVariable UUID studyRecordId
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getStudyRecord(context.bearerToken(), cohortId, studyRecordId));
    }

    @GetMapping("/study-records")
    public JsonNode getDailyStudyRecords(
            HttpServletRequest request,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getDailyStudyRecords(context.bearerToken(), cohortId, date.toString()));
    }

    @GetMapping("/study-time-summaries")
    public JsonNode getMonthlyStudyTimeSummary(
            HttpServletRequest request,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getMonthlyStudyTimeSummary(
                        context.bearerToken(), cohortId, month.toString()
                ));
    }

    @PostMapping("/study-records")
    public ResponseEntity<JsonNode> createStudyRecord(
            HttpServletRequest request,
            @RequestBody JsonNode body
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .createStudyRecord(context.bearerToken(), cohortId, body));
    }

    @PutMapping("/study-records/{studyRecordId}")
    public JsonNode updateStudyRecord(
            HttpServletRequest request,
            @PathVariable UUID studyRecordId,
            @RequestBody JsonNode body
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .updateStudyRecord(
                        context.bearerToken(), cohortId, studyRecordId, body
                ));
    }

    @DeleteMapping("/study-records/{studyRecordId}")
    public ResponseEntity<Void> deleteStudyRecord(
            HttpServletRequest request,
            @RequestHeader(RESOURCE_VERSION_HEADER) Long resourceVersion,
            @PathVariable UUID studyRecordId
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .deleteStudyRecord(
                        context.bearerToken(),
                        cohortId,
                        studyRecordId,
                        resourceVersion
                ));
    }
}
