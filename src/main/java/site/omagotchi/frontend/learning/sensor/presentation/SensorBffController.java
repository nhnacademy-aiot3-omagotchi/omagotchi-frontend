package site.omagotchi.frontend.learning.sensor.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;
import tools.jackson.databind.JsonNode;


@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/sensors")
public class SensorBffController {

    private final LearningProxyBffService proxy;

    @GetMapping("/spaces")
    public JsonNode getSpaces(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service().getSpaces(context.bearerToken()));
    }

    @GetMapping("/devices")
    public JsonNode getDevices(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service().getSensorDevices(context.bearerToken()));
    }

    @PostMapping("/devices")
    public JsonNode createDevice(HttpServletRequest request, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service().createSensorDevice(context.bearerToken(), body));
    }

    @PutMapping("/devices/{deviceEui}")
    public JsonNode updateDevice(
            HttpServletRequest request,
            @PathVariable String deviceEui,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context ->
                context.service().updateSensorDevice(context.bearerToken(), deviceEui, body));
    }

    @PatchMapping("/devices/{deviceEui}/active")
    public JsonNode updateDeviceActive(
            HttpServletRequest request,
            @PathVariable String deviceEui,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context ->
                context.service().updateSensorDeviceActive(context.bearerToken(), deviceEui, body));
    }

    /**
     * 품질·룰 적중 로그. 필터와 페이징을 하류가 처리하므로 질의 조건을 그대로 넘긴다.
     */
    @GetMapping("/events")
    public JsonNode getEvents(
            HttpServletRequest request,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String deviceEui,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return proxy.execute(request, context ->
                context.service().getSensorEvents(context.bearerToken(), type, deviceEui, from, to, page, size));
    }

    @GetMapping("/thresholds")
    public JsonNode getSpaceThresholds(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service().getSpaceThresholds(context.bearerToken()));
    }


    @PatchMapping("/thresholds/{spaceId}")
    public JsonNode applySpaceThreshold(
            HttpServletRequest request,
            @PathVariable Long spaceId,
            @RequestBody JsonNode body
    ) {
        String requestId = request.getHeader("X-Request-ID");
        return proxy.execute(request, context ->
                context.service().applySpaceThreshold(context.bearerToken(), spaceId, requestId, body));
    }
}
