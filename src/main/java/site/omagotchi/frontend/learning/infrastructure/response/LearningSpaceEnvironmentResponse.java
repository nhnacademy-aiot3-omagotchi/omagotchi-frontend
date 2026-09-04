package site.omagotchi.frontend.learning.infrastructure.response;

import java.time.Instant;

/**
 * Learning Service 가 내려주는 공간 한 곳의 현재 실내 환경.
 *
 * <p>측정이 없거나 오래된 항목은 null 이다. 0 으로 채워 오지 않는다.</p>
 */
public record LearningSpaceEnvironmentResponse(
        Long spaceId,
        Double co2,
        Double temperature,
        Double humidity,
        Instant measuredAt,
        Integer deviceCount
) {
}
