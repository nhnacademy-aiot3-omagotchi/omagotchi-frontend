package site.omagotchi.frontend.learning.series.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSpaceEnvironmentResponse;
import tools.jackson.databind.JsonNode;

import java.util.List;

@HttpExchange("/api/v1")
public interface SensorHttpService {

    @GetExchange("/cohorts/{cohort-id}/sensors/space-series")
    JsonNode getSpaceSeries(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam String location,
            @RequestParam String measurement,
            @RequestParam String window
    );

    /** 기수가 쓰는 공간 전부의 현재 환경. 공간마다 부르지 않는다. */
    @GetExchange("/cohorts/{cohort-id}/sensors/environment")
    List<LearningSpaceEnvironmentResponse> getSpaceEnvironments(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable("cohort-id") Long cohortId
    );
}