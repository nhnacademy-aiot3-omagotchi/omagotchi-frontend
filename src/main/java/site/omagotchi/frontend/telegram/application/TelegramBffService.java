package site.omagotchi.frontend.telegram.application;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.global.learning.application.LearningSessionAuthorization;
import site.omagotchi.frontend.global.learning.infrastructure.LearningDownstreamException;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;
import site.omagotchi.frontend.telegram.infrastructure.TelegramHttpService;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramLinkTokenResponse;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramUserLinkResponse;

import java.util.Map;
import java.util.Optional;

/**
 * Telegram 연동의 Session 경계.
 *
 * <p>연동은 계정 단위라 승인 기수를 확인하지 않는다. {@code LearningCohortContext}가 아니라
 * {@link LearningSessionAuthorization}만 쓰는 이유이며, 기수 가입 전 사용자도 알림을 받을 수
 * 있어야 하기 때문이다.
 */
@Service
@RequiredArgsConstructor
public class TelegramBffService {

    private static final String LINK_NOT_FOUND_CODE = "TELEGRAM_USER_LINK_NOT_FOUND";

    private final TelegramHttpService telegramHttpService;
    private final LearningGatewayCallExecutor callExecutor;
    private final LearningSessionAuthorization authorization;

    public TelegramLinkTokenResponse issueLinkToken(HttpServletRequest request) {
        return callExecutor.execute(() -> telegramHttpService.issueLinkToken(bearer(request)));
    }

    /**
     * 연동 상태를 조회한다. 미연동이면 빈 값을 돌려준다.
     */
    public Optional<TelegramUserLinkResponse> findMyLink(HttpServletRequest request) {
        try {
            return Optional.ofNullable(
                    callExecutor.execute(() -> telegramHttpService.getMyLink(bearer(request)))
            );
        } catch (LearningDownstreamException exception) {
            // 미연동은 오류가 아니라 초기 상태다. 하류 404를 그대로 올리면 설정 화면이
            // 진입할 때마다 오류 경로를 타고, 사용자에게 "찾을 수 없습니다"가 보인다.
            if (isLinkNotFound(exception)) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    public TelegramUserLinkResponse updateNotification(HttpServletRequest request, boolean enabled) {
        return callExecutor.execute(() -> telegramHttpService.updateNotification(
                bearer(request),
                Map.of("enabled", enabled)
        ));
    }

    public TelegramUserLinkResponse disconnect(HttpServletRequest request) {
        return callExecutor.execute(() -> telegramHttpService.disconnect(bearer(request)));
    }

    private String bearer(HttpServletRequest request) {
        return authorization.bearerToken(request);
    }

    private static boolean isLinkNotFound(LearningDownstreamException exception) {
        return exception.getStatusCode().value() == HttpStatus.NOT_FOUND.value()
                && LINK_NOT_FOUND_CODE.equals(exception.getErrorResponse().code());
    }
}
