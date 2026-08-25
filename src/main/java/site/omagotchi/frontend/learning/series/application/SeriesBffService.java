package site.omagotchi.frontend.learning.series.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.learning.application.LearningCohortContext;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
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
        String bearerToken = cohortContext.bearerToken(request);
        return callExecutor.execute(() -> sensorHttpService.getSpaceSeries(
                bearerToken, location, measurement, window));
    }
}