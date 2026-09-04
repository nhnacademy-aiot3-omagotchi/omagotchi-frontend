package site.omagotchi.frontend.space.presentation.response;

import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.time.Instant;

public record SpaceEnvironmentResponse(
        Long spaceId,
        Double co2,
        Double temperature,
        Double humidity,
        Instant measuredAt,
        Integer deviceCount
) {

    public static SpaceEnvironmentResponse from(SpaceEnvironmentView view) {
        return new SpaceEnvironmentResponse(
                view.spaceId(),
                view.co2(),
                view.temperature(),
                view.humidity(),
                view.measuredAt(),
                view.deviceCount()
        );
    }
}
