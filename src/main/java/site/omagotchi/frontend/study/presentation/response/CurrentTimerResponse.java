package site.omagotchi.frontend.study.presentation.response;

import site.omagotchi.frontend.study.application.result.CurrentTimerView;
import site.omagotchi.frontend.study.application.result.TimerState;

import java.time.Instant;
import java.util.UUID;

public record CurrentTimerResponse(
        TimerState state,
        UUID timerRunId,
        Instant startedAt,
        long elapsedSeconds
) {

    public static CurrentTimerResponse from(CurrentTimerView view) {
        return new CurrentTimerResponse(
                view.state(),
                view.timerRunId(),
                view.startedAt(),
                view.elapsedSeconds()
        );
    }
}
