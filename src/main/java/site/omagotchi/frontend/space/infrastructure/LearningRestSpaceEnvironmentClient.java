package site.omagotchi.frontend.space.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.response.LearningSpaceEnvironmentResponse;
import site.omagotchi.frontend.learning.series.infrastructure.SensorHttpService;
import site.omagotchi.frontend.space.application.port.SpaceEnvironmentClient;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class LearningRestSpaceEnvironmentClient implements SpaceEnvironmentClient {

    private final SensorHttpService httpService;
    private final LearningGatewayCallExecutor callExecutor;

    @Override
    public List<SpaceEnvironmentView> findByCohort(String bearerToken, Long cohortId) {
        List<LearningSpaceEnvironmentResponse> environments = callExecutor.execute(
                () -> httpService.getSpaceEnvironments(bearerToken, cohortId)
        );

        if (environments == null) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    "공간 실내 환경 조회 성공 응답 Body 누락"
            );
        }

        // spaceId 가 없으면 화면이 카드에 붙일 수 없다. 그런 항목은 버린다.
        return environments.stream()
                .filter(environment -> Objects.nonNull(environment)
                        && Objects.nonNull(environment.spaceId()))
                .map(LearningRestSpaceEnvironmentClient::toView)
                .toList();
    }

    private static SpaceEnvironmentView toView(LearningSpaceEnvironmentResponse response) {
        return new SpaceEnvironmentView(
                response.spaceId(),
                response.co2(),
                response.temperature(),
                response.humidity(),
                response.measuredAt(),
                response.deviceCount()
        );
    }
}
