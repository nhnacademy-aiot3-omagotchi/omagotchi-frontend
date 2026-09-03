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
import site.omagotchi.frontend.study.application.result.CurrentTimerView;
import site.omagotchi.frontend.study.application.result.StartTimerView;
import site.omagotchi.frontend.study.infrastructure.response.LearningCurrentTimerResponse;
import site.omagotchi.frontend.study.infrastructure.response.LearningStartTimerResponse;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudyTimerBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    public CurrentTimerView getCurrentTimer(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<LearningCurrentTimerResponse> response = callExecutor.execute(
                () -> learningHttpService.getCurrentTimer(
                        context.bearerToken(), context.cohortId())
        );
        requireStatus(response, HttpStatus.OK, "현재 타이머 조회");
        return StudyResponseContracts.requireCurrentTimer(
                requireBody(response, "현재 타이머 조회"),
                "현재 타이머 조회"
        );
    }

    public StartTimerView startTimer(HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<LearningStartTimerResponse> response = callExecutor.execute(
                () -> learningHttpService.startTimer(
                        context.bearerToken(), context.cohortId())
        );
        requireStatus(response, HttpStatus.CREATED, "타이머 시작");
        return StudyResponseContracts.requireStartedTimer(
                requireBody(response, "타이머 시작"),
                "타이머 시작"
        );
    }

    public void stopTimer(UUID timerRunId, HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.stopTimer(
                        context.bearerToken(),
                        context.cohortId(),
                        timerRunId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "타이머 종료");
    }

    public void discardTimer(UUID timerRunId, HttpServletRequest request) {
        LearningCohortContext.Resolved context = cohortContext.resolve(request);
        ResponseEntity<Void> response = callExecutor.execute(
                () -> learningHttpService.discardTimer(
                        context.bearerToken(),
                        context.cohortId(),
                        timerRunId
                )
        );
        requireStatus(response, HttpStatus.NO_CONTENT, "타이머 폐기");
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
