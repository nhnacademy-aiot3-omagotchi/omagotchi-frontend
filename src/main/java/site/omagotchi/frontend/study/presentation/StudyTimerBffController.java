package site.omagotchi.frontend.study.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/timer")
public class StudyTimerBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getCurrentTimer(HttpServletRequest request) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getCurrentTimer(context.bearerToken(), cohortId));
    }

    @PostMapping("/start")
    public ResponseEntity<JsonNode> startTimer(HttpServletRequest request) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .startTimer(context.bearerToken(), cohortId));
    }

    @PostMapping("/{timer-run-id}/stop")
    public ResponseEntity<Void> stopTimer(
            HttpServletRequest request,
            @PathVariable("timer-run-id") UUID timerRunId
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .stopTimer(context.bearerToken(), cohortId, timerRunId));
    }

    @PostMapping("/{timer-run-id}/discard")
    public ResponseEntity<Void> discardTimer(
            HttpServletRequest request,
            @PathVariable("timer-run-id") UUID timerRunId
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .discardTimer(context.bearerToken(), cohortId, timerRunId));
    }
}
