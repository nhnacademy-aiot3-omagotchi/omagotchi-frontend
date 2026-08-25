package site.omagotchi.frontend.profile.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.global.learning.infrastructure.LearningHttpService;
import site.omagotchi.frontend.profile.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.profile.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;

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

        // 하류가 2xx를 반환해도 Body가 비어 올 수 있다. NPE 대신 계약 위반으로 처리한다.
        if (profile == null) {
            throw new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE);
        }
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
