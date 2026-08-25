package site.omagotchi.frontend.learning.series.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.series.application.SeriesBffService;
import tools.jackson.databind.JsonNode;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/sensors")
public class SeriesBffController {

    private final SeriesBffService seriesBffService;

    @GetMapping("/space-series")
    public JsonNode getSpaceSeries(
            HttpServletRequest request,
            @RequestParam String location,
            @RequestParam String measurement,
            @RequestParam String window
    ) {
        return seriesBffService.getSpaceSeries(request, location, measurement, window);
    }
}