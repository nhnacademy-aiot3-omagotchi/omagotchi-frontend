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
 * <p>센서와 임계값은 <b>기수에 속한 자원</b>이다 — 센서는 공간에 붙고 공간은 기수가 관리한다.
 * 그래서 승인 기수를 확보해 하류 경로에 실어 보낸다. cohortId를 Browser에서 받지 않는 이유는
 * {@link LearningCohortContext}의 javadoc과 같다. 공간 목록만 기수 경계 밖이라 Token만 쓴다.
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

    /** 공간 목록은 기수 경계 밖이다. 화면이 spaceId와 이름을 변환하는 데만 쓴다. */
    public JsonNode getSpaces(HttpServletRequest request) {
        String bearerToken = cohortContext.bearerToken(request);
        return callExecutor.execute(() -> sensorAdminHttpService.getSpaces(bearerToken));
    }

    public JsonNode getDevices(HttpServletRequest request) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.getSensorDevices(token, cohortId));
    }

    public JsonNode createDevice(HttpServletRequest request, JsonNode body) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.createSensorDevice(token, cohortId, body));
    }

    /**
     * 주인 없는 센서 인계.
     *
     * <p>하류가 "인계할 수 있는 센서가 아니다"를 404로 답한다 — 남의 기수 소유인 경우와
     * 아예 없는 경우를 구분하지 않는다. 구분해 주면 다른 기수 구성을 훑을 수 있다.
     */
    public JsonNode claimDevice(HttpServletRequest request, String deviceEui, JsonNode body) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.claimSensorDevice(token, cohortId, deviceEui, body));
    }

    public JsonNode updateDevice(HttpServletRequest request, String deviceEui, JsonNode body) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.updateSensorDevice(token, cohortId, deviceEui, body));
    }

    public JsonNode updateDeviceActive(HttpServletRequest request, String deviceEui, JsonNode body) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.updateSensorDeviceActive(token, cohortId, deviceEui, body));
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
        return callWithCohort(request, (token, cohortId) -> sensorAdminHttpService
                .getSensorEvents(token, cohortId, type, deviceEui, from, to, page, size));
    }

    public JsonNode getSpaceThresholds(HttpServletRequest request) {
        return callWithCohort(request, (token, cohortId) ->
                sensorAdminHttpService.getSpaceThresholds(token, cohortId));
    }

    public JsonNode applySpaceThreshold(
            HttpServletRequest request,
            Long spaceId,
            String requestId,
            JsonNode body
    ) {
        return callWithCohort(request, (token, cohortId) -> sensorAdminHttpService
                .applySpaceThreshold(token, cohortId, spaceId, requestId, body));
    }

    private JsonNode callWithCohort(HttpServletRequest request, CohortScopedCall downstreamCall) {
        LearningCohortContext.Resolved resolved = cohortContext.resolve(request);
        return callExecutor.execute(
                () -> downstreamCall.execute(resolved.bearerToken(), resolved.cohortId())
        );
    }

    @FunctionalInterface
    private interface CohortScopedCall {
        JsonNode execute(String bearerToken, Long cohortId);
    }
}
