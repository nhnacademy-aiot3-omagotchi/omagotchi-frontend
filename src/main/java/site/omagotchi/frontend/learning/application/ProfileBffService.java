package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.learning.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.learning.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.learning.infrastructure.response.UserProfileResponse;

@Service
@RequiredArgsConstructor
public class ProfileBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public UserProfileResponse getMyProfile(HttpServletRequest request) {
        String bearerToken = authorization.bearerToken(request);
        UserProfileResponse profile = callExecutor.execute(
                () -> learningHttpService.getMyProfile(bearerToken)
        );
        return profile.withUserId(authorization.userId(request));
    }

    public UserNicknameResponse updateMyNickname(
            HttpServletRequest servletRequest,
            UpdateNicknameRequest request
    ) {
        String bearerToken = authorization.bearerToken(servletRequest);
        return callExecutor.execute(() -> learningHttpService.updateMyNickname(
                bearerToken,
                request
        ));
    }
}
