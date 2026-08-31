package site.omagotchi.frontend.learning.sensor.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.sensor.application.SensorAdminBffService;
import tools.jackson.databind.JsonNode;

/**
 * 관리자 센서 운영 Endpoint.
 *
 * <p>시계열 조회(space-series)는 SeriesBffController가 같은 base path에서 담당한다.
 * 경로가 겹치지 않으므로 두 Controller가 공존한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/sensors")
public class SensorAdminBffController {

    private final SensorAdminBffService sensorAdminBffService;

    @GetMapping("/spaces")
    public JsonNode getSpaces(HttpServletRequest request) {
        return sensorAdminBffService.getSpaces(request);
    }

    @GetMapping("/devices")
    public JsonNode getDevices(HttpServletRequest request) {
        return sensorAdminBffService.getDevices(request);
    }

    @PostMapping("/devices")
    public JsonNode createDevice(HttpServletRequest request, @RequestBody JsonNode body) {
        return sensorAdminBffService.createDevice(request, body);
    }

    @PutMapping("/devices/{device-eui}")
    public JsonNode updateDevice(
            HttpServletRequest request,
            @PathVariable("device-eui") String deviceEui,
            @RequestBody JsonNode body
    ) {
        return sensorAdminBffService.updateDevice(request, deviceEui, body);
    }

    @PatchMapping("/devices/{device-eui}/active")
    public JsonNode updateDeviceActive(
            HttpServletRequest request,
            @PathVariable("device-eui") String deviceEui,
            @RequestBody JsonNode body
    ) {
        return sensorAdminBffService.updateDeviceActive(request, deviceEui, body);
    }

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
        return sensorAdminBffService.getEvents(request, type, deviceEui, from, to, page, size);
    }

    @GetMapping("/thresholds")
    public JsonNode getSpaceThresholds(HttpServletRequest request) {
        return sensorAdminBffService.getSpaceThresholds(request);
    }

    /**
     * 공간 안 모든 기기의 임계치를 한 번에 맞춘다.
     *
     * <p>requestId는 하류의 멱등 처리용이다. Browser가 보내지 않으면 하류가 스스로 처리한다.
     */
    @PatchMapping("/thresholds/{space-id}")
    public JsonNode applySpaceThreshold(
            HttpServletRequest request,
            @PathVariable("space-id") Long spaceId,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId,
            @RequestBody JsonNode body
    ) {
        return sensorAdminBffService.applySpaceThreshold(request, spaceId, requestId, body);
    }
}
