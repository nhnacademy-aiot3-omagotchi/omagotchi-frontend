package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.StartTimerView;
import site.omagotchi.frontend.study.application.result.TimerState;

import java.time.Instant;
import java.util.UUID;

public record StartTimerResponse(
        String resultCode,
        UUID timerRunId,
        TimerState state,
        Instant startedAt,
        long elapsedSeconds
) {

    public static StartTimerResponse from(StartTimerView view) {
        return new StartTimerResponse(
                view.resultCode(),
                view.timerRunId(),
                view.state(),
                view.startedAt(),
                view.elapsedSeconds()
        );
    }
}
