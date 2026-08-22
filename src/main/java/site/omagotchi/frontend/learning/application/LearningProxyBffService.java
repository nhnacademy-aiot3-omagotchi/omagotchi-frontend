package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;

import java.util.function.BiFunction;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class LearningProxyBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningCohortContext cohortContext;

    /**
     * Session Token만 필요한 하류 호출. 승인 기수 조회를 수행하지 않는다.
     */
    public <T> T execute(
            HttpServletRequest request,
            Function<AuthorizedLearningRequest, T> operation
    ) {
        String bearerToken = cohortContext.bearerToken(request);
        return callExecutor.execute(() -> operation.apply(
                new AuthorizedLearningRequest(learningHttpService, bearerToken)
        ));
    }

    /**
     * 승인 기수가 필요한 하류 호출.
     *
     * <p>cohortId를 Browser 요청에서 받지 않고 Session Token 기반 Profile에서 확보한다.
     * Browser가 지정한 cohortId를 그대로 전달하면 다른 기수 자원 조회 시도를 View가
     * 그대로 통과시키는 결과가 되므로, 이 경로에서는 Browser 입력을 신뢰하지 않는다.
     */
    public <T> T executeWithCohort(
            HttpServletRequest request,
            BiFunction<AuthorizedLearningRequest, Long, T> operation
    ) {
        LearningCohortContext.Resolved resolved = cohortContext.resolve(request);
        return callExecutor.execute(() -> operation.apply(
                new AuthorizedLearningRequest(learningHttpService, resolved.bearerToken()),
                resolved.cohortId()
        ));
    }

    public record AuthorizedLearningRequest(
            LearningHttpService service,
            String bearerToken
    ) {
    }
}
