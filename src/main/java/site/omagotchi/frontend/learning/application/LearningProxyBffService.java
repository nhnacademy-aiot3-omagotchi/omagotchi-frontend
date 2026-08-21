package site.omagotchi.frontend.learning.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.learning.infrastructure.LearningHttpService;

import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class LearningProxyBffService {

    private final LearningHttpService learningHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public <T> T execute(
            HttpServletRequest request,
            Function<AuthorizedLearningRequest, T> operation
    ) {
        String bearerToken = authorization.bearerToken(request);
        return callExecutor.execute(() -> operation.apply(
                new AuthorizedLearningRequest(learningHttpService, bearerToken)
        ));
    }

    public record AuthorizedLearningRequest(
            LearningHttpService service,
            String bearerToken
    ) {
    }
}
