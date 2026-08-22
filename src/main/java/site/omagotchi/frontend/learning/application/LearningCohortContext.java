package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.response.UserProfileResponse;

/**
 * 승인 기수 컨텍스트 확보의 단일 지점.
 *
 * <p>cohortId를 Browser 입력으로 받으면 다른 기수의 자원을 조회하는 요청을 만들 수 있으므로
 * Session Token과 Learning Profile을 통해서만 획득한다. 기능마다 획득 경로가 달라지면
 * 신뢰 경계가 어긋나므로 모든 BFF Service가 이 Component를 사용한다.
 *
 * <p>한 HTTP 요청 안에서 여러 BFF Service가 호출해도 Profile 조회는 1회만 수행한다.
 * Request Attribute Cache가 없으면 화면 하나에서 Gateway 왕복이 기능 수만큼 늘어난다.
 */
@Component
@RequiredArgsConstructor
public class LearningCohortContext {

    private static final String REQUEST_ATTRIBUTE = LearningCohortContext.class.getName();

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    /**
     * Session Token만 필요한 호출용. Profile 조회를 수행하지 않는다.
     */
    public String bearerToken(HttpServletRequest request) {
        return authorization.bearerToken(request);
    }

    /**
     * 승인 기수가 필요한 호출용. 승인 기수가 없으면 하류를 호출하지 않고 중단한다.
     */
    public Resolved resolve(HttpServletRequest request) {
        Object cached = request.getAttribute(REQUEST_ATTRIBUTE);
        if (cached instanceof Resolved resolved) {
            return resolved;
        }

        String bearerToken = authorization.bearerToken(request);
        UserProfileResponse profile = callExecutor.execute(
                () -> learningHttpService.getMyProfile(bearerToken)
        );

        // 하류가 2xx를 반환해도 필수 필드가 비어 올 수 있으므로 여기에서 계약을 검증한다.
        if (profile == null
                || profile.approvedCohort() == null
                || profile.approvedCohort().cohortId() == null) {
            throw new BusinessException(LearningBffErrorCode.APPROVED_COHORT_REQUIRED);
        }

        Resolved resolved = new Resolved(bearerToken, profile.approvedCohort().cohortId());
        request.setAttribute(REQUEST_ATTRIBUTE, resolved);
        return resolved;
    }

    public record Resolved(String bearerToken, Long cohortId) {
    }
}
