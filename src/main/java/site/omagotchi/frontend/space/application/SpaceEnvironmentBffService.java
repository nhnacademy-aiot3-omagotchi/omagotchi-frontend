package site.omagotchi.frontend.space.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.learning.application.LearningCohortContext;
import site.omagotchi.frontend.space.application.port.SpaceEnvironmentClient;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.util.List;

/**
 * 실습실·회의실 카드에 붙는 실내 환경 값.
 *
 * <p>Learning Service 가 기수 단위로 모아 주므로 여기서는 승인 기수만 확보해 그대로 옮긴다.
 * 예전에는 공간마다 시계열을 불러 마지막 점을 골랐는데, 공간 수 × 측정 항목 수만큼 왕복이
 * 생기고 오래된 값이 현재 값처럼 보였다. 값의 신선도 판정은 하류가 한다.</p>
 */
@Service
@RequiredArgsConstructor
public class SpaceEnvironmentBffService {

    private final SpaceEnvironmentClient spaceEnvironmentClient;
    private final LearningCohortContext cohortContext;

    public List<SpaceEnvironmentView> findMyCohortEnvironments(HttpServletRequest request) {
        // 기수는 Session Token 으로만 얻는다 — Browser 가 지정한 값이 아니다
        LearningCohortContext.Resolved context = cohortContext.resolve(request);

        return spaceEnvironmentClient.findByCohort(context.bearerToken(), context.cohortId());
    }
}
