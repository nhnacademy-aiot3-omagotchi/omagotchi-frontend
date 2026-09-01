package site.omagotchi.frontend.learning.series.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.series.infrastructure.SensorHttpService;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
public class SeriesBffService {

    private final SensorHttpService sensorHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    public JsonNode getSpaceSeries(
            HttpServletRequest request,
            String location,
            String measurement,
            String window
    ) {
        // 공간 시계열은 기수 범위 집계다 — 승인 기수를 확보해 하류 경로에 싣는다
        LearningCohortContext.Resolved resolved = cohortContext.resolve(request);
        return callExecutor.execute(() -> sensorHttpService.getSpaceSeries(
                resolved.bearerToken(), resolved.cohortId(), location, measurement, window));
    }
}