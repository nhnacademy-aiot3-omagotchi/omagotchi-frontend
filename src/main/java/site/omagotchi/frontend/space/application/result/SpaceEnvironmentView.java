package site.omagotchi.frontend.space.application.result;

import java.time.Instant;

/**
 * 공간 한 곳의 최근 실내 환경.
 *
 * <p>측정이 없는 항목은 null이다. 화면이 값 없는 항목을 그대로 비워 두므로 0으로 채우지 않는다.</p>
 *
 * <p>deviceCount는 그 공간의 운영 중인 센서 수다. 0이면 화면이 "센서 없음"으로,
 * 1 이상인데 값이 비면 "측정 대기"로 구분해 말한다. 하류가 이 값을 주지 않으면 null이다.</p>
 */
public record SpaceEnvironmentView(
        Long spaceId,
        Double co2,
        Double temperature,
        Double humidity,
        Instant measuredAt,
        Integer deviceCount
) {

    public static SpaceEnvironmentView empty(Long spaceId) {
        return new SpaceEnvironmentView(spaceId, null, null, null, null, 0);
    }
}
