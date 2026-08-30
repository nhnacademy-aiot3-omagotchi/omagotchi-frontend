package site.omagotchi.frontend.cohort.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.cohort.infrastructure.response.UserAccessContextResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;

@Service
@RequiredArgsConstructor
public class UserAccessContextBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public UserAccessContextResponse getContext(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        UserAccessContextResponse context = callExecutor.execute(
                () -> learningHttpService.getMyAccessContext(bearerToken)
        );
        if (context == null || context.accessType() == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        }
        return context;
    }
}
