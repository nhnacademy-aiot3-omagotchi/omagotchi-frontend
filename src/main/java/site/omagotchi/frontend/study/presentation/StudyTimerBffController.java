package site.omagotchi.frontend.study.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.study.application.StudyTimerBffService;
import site.omagotchi.frontend.study.presentation.response.CurrentTimerResponse;
import site.omagotchi.frontend.study.presentation.response.StartTimerResponse;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/timer")
public class StudyTimerBffController {

    private final StudyTimerBffService studyTimerBffService;

    @GetMapping
    public CurrentTimerResponse getCurrentTimer(HttpServletRequest request) {
        return CurrentTimerResponse.from(
                studyTimerBffService.getCurrentTimer(request)
        );
    }

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public StartTimerResponse startTimer(HttpServletRequest request) {
        return StartTimerResponse.from(
                studyTimerBffService.startTimer(request)
        );
    }

    @PostMapping("/{timer-run-id}/stop")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void stopTimer(
            HttpServletRequest request,
            @PathVariable("timer-run-id") UUID timerRunId
    ) {
        studyTimerBffService.stopTimer(timerRunId, request);
    }

    @PostMapping("/{timer-run-id}/discard")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discardTimer(
            HttpServletRequest request,
            @PathVariable("timer-run-id") UUID timerRunId
    ) {
        studyTimerBffService.discardTimer(timerRunId, request);
    }
}
