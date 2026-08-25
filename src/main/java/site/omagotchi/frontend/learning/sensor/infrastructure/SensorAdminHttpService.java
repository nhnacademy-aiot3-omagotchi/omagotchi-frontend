package site.omagotchi.frontend.learning.sensor.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import org.springframework.web.service.annotation.PutExchange;
import tools.jackson.databind.JsonNode;

/**
 * 센서 기기·임계값·품질 로그 호출.
 *
 * <p>시계열 조회는 {@code learning.series}의 SensorHttpService가 담당한다. 이 슬라이스는
 * 운영 데이터(기기 등록/수정, 공간 임계값, 알림 로그)만 다룬다.
 */
@HttpExchange("/api/v1")
public interface SensorAdminHttpService {

    /** 공간 목록. 화면이 spaceId와 이름을 서로 변환하는 데 쓴다. */
    @GetExchange("/spaces")
    JsonNode getSpaces(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @GetExchange("/sensors")
    JsonNode getSensorDevices(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @PostExchange("/sensors")
    JsonNode createSensorDevice(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody JsonNode request
    );

    @PutExchange("/sensors/{deviceEui}")
    JsonNode updateSensorDevice(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String deviceEui,
            @RequestBody JsonNode request
    );

    @PatchExchange("/sensors/{deviceEui}/active")
    JsonNode updateSensorDeviceActive(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable String deviceEui,
            @RequestBody JsonNode request
    );

    /**
     * 품질·룰 적중 로그. 필터와 페이징은 하류가 처리하므로 조건을 그대로 넘긴다.
     *
     * <p>선택 파라미터가 null이면 Spring이 쿼리에서 제외한다. 여기서 기본값을 채우면
     * 하류의 required=false 계약보다 엄격해져 정상 요청을 막게 된다.
     */
    @GetExchange("/sensors/events")
    JsonNode getSensorEvents(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String deviceEui,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    );

    /** 공간별 현재 임계치. 화면이 이 값으로 임계값 입력 폼을 그린다. */
    @GetExchange("/threshold-rules/spaces")
    JsonNode getSpaceThresholds(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization);

    @PatchExchange("/threshold-rules/spaces/{spaceId}")
    JsonNode applySpaceThreshold(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @PathVariable Long spaceId,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId,
            @RequestBody JsonNode request
    );
}
