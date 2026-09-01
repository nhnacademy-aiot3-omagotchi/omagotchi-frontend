package site.omagotchi.frontend.telegram.infrastructure;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.DeleteExchange;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;
import org.springframework.web.service.annotation.PatchExchange;
import org.springframework.web.service.annotation.PostExchange;
import site.omagotchi.frontend.telegram.infrastructure.request.TelegramNotificationRequest;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramLinkTokenResponse;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramUserLinkResponse;

/**
 * Learning의 Telegram 연동 계약.
 *
 * <p>연동은 계정 단위이므로 기수 범위를 받지 않는다. 승인 기수가 없는 사용자도 연동할 수 있어야
 * 하므로 Session Token만 전달한다.
 */
@HttpExchange("/api/v1")
public interface TelegramHttpService {

    /**
     * 1회용 연동 딥링크를 발급한다. 유효 기간은 Learning이 정한다.
     */
    @PostExchange("/telegram/link-token")
    TelegramLinkTokenResponse issueLinkToken(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    /**
     * 연동 상태를 조회한다.
     *
     * <p>미연동이면 Learning이 {@code TELEGRAM_USER_LINK_NOT_FOUND}로 404를 반환한다.
     * 오류가 아니라 초기 상태이므로 변환은 Application이 맡는다.
     */
    @GetExchange("/telegram/link")
    TelegramUserLinkResponse getMyLink(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );

    @PatchExchange("/telegram/link/notification")
    TelegramUserLinkResponse updateNotification(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody TelegramNotificationRequest body
    );

    @DeleteExchange("/telegram/link")
    TelegramUserLinkResponse disconnect(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    );
}
