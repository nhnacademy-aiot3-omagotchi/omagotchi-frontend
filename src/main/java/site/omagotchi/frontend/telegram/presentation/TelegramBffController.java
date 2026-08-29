package site.omagotchi.frontend.telegram.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.telegram.application.TelegramBffService;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramLinkTokenResponse;
import site.omagotchi.frontend.telegram.infrastructure.response.TelegramUserLinkResponse;
import site.omagotchi.frontend.telegram.presentation.request.UpdateTelegramNotificationRequest;

/**
 * telegram_link_tokens에 알려진 토큰의 SHA-256을 넣고 웹훅을 흉내 낸 POST를 보내면
 * 로컬에서도 동작 확인이 가능합니다. 메시지는 못받지만
 */
@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/telegram")
public class TelegramBffController {

    private final TelegramBffService telegramBffService;

    /**
     * 연동 딥링크를 발급한다.
     *
     * 성공: 200 OK — 딥링크와 만료 시각<br>
     * 실패: 401 세션 없음
     *
     * @return 딥링크와 만료 시각을 반환한다.
     */
    @PostMapping("/link-token")
    public TelegramLinkTokenResponse issueLinkToken(HttpServletRequest request) {
        return telegramBffService.issueLinkToken(request);
    }

    /**
     * 요청자의 연동 상태를 조회한다.
     *
     * 성공: 200 OK 연동됨 — 연동 시각과 알림 설정<br>
     * 성공: 204 No Content 미연동 — 오류가 아니라 초기 상태다<br>
     * 실패: 401 세션 없음
     *
     * @return 연동 정보를 반환하며, 미연동이면 본문이 없다.
     */
    @GetMapping("/link")
    public ResponseEntity<TelegramUserLinkResponse> getMyLink(HttpServletRequest request) {
        return telegramBffService.findMyLink(request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * 알림 수신 여부를 변경한다.
     *
     * 성공: 200 OK — 변경된 연동 정보<br>
     * 실패: 401 세션 없음, 404 미연동 상태에서 변경 시도
     *
     * @param body 변경할 수신 여부를 제공한다.
     * @return 변경된 연동 정보를 반환한다.
     */
    @PatchMapping("/link/notification")
    public TelegramUserLinkResponse updateNotification(
            HttpServletRequest request,
            @Valid @RequestBody UpdateTelegramNotificationRequest body
    ) {
        return telegramBffService.updateNotification(request, body.enabled());
    }

    /**
     * 연동을 해제한다.
     *
     * 성공: 200 OK — 해제된 연동 정보<br>
     * 실패: 401 세션 없음, 404 이미 해제되었거나 연동된 적 없음
     *
     * @return 해제된 연동 정보를 반환한다.
     */
    @DeleteMapping("/link")
    public TelegramUserLinkResponse disconnect(HttpServletRequest request) {
        return telegramBffService.disconnect(request);
    }
}
