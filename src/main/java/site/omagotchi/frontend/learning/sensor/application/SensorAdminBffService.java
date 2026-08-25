package site.omagotchi.frontend.learning.sensor.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.sensor.infrastructure.SensorAdminHttpService;
import tools.jackson.databind.JsonNode;

/**
 * 센서 운영 데이터 프록시.
 *
 * <p>센서·공간·임계값은 기수가 아니라 설비에 속한 자원이므로 승인 기수를 확인하지 않는다.
 * Session Token만 확보해 하류로 넘긴다. 권한은 하류가 SYSTEM_ADMIN으로 검증한다.
 *
 * <p>응답을 가공하지 않고 JsonNode 그대로 흘린다. 화면이 Learning Service의 필드명을
 * 그대로 읽도록 만들어져 있어, 중간에서 이름을 바꾸면 화면과 어긋난다.
 */
@Service
@RequiredArgsConstructor
public class SensorAdminBffService {

    private final SensorAdminHttpService sensorAdminHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    public JsonNode getSpaces(HttpServletRequest request) {
        return call(request, token -> sensorAdminHttpService.getSpaces(token));
    }

    public JsonNode getDevices(HttpServletRequest request) {
        return call(request, token -> sensorAdminHttpService.getSensorDevices(token));
    }

    public JsonNode createDevice(HttpServletRequest request, JsonNode body) {
        return call(request, token -> sensorAdminHttpService.createSensorDevice(token, body));
    }

    public JsonNode updateDevice(HttpServletRequest request, String deviceEui, JsonNode body) {
        return call(request, token -> sensorAdminHttpService.updateSensorDevice(token, deviceEui, body));
    }

    public JsonNode updateDeviceActive(HttpServletRequest request, String deviceEui, JsonNode body) {
        return call(request, token -> sensorAdminHttpService.updateSensorDeviceActive(token, deviceEui, body));
    }

    public JsonNode getEvents(
            HttpServletRequest request,
            String type,
            String deviceEui,
            String from,
            String to,
            Integer page,
            Integer size
    ) {
        return call(request, token ->
                sensorAdminHttpService.getSensorEvents(token, type, deviceEui, from, to, page, size));
    }

    public JsonNode getSpaceThresholds(HttpServletRequest request) {
        return call(request, token -> sensorAdminHttpService.getSpaceThresholds(token));
    }

    public JsonNode applySpaceThreshold(
            HttpServletRequest request,
            Long spaceId,
            String requestId,
            JsonNode body
    ) {
        return call(request, token ->
                sensorAdminHttpService.applySpaceThreshold(token, spaceId, requestId, body));
    }

    private JsonNode call(HttpServletRequest request, DownstreamCall downstreamCall) {
        String bearerToken = cohortContext.bearerToken(request);
        return callExecutor.execute(() -> downstreamCall.execute(bearerToken));
    }

    @FunctionalInterface
    private interface DownstreamCall {
        JsonNode execute(String bearerToken);
    }
}
