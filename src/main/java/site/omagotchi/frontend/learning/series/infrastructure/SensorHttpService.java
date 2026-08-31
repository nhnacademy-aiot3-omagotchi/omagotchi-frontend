package site.omagotchi.frontend.learning.series.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import tools.jackson.databind.JsonNode;

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
}