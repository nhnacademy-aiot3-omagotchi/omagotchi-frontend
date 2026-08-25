package site.omagotchi.frontend.presence.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.presence.application.PresenceBffService;
import tools.jackson.databind.JsonNode;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/presence")
public class PresenceBffController {

    private final PresenceBffService presenceBffService;

    /**
     * 수동 새로고침용 단건 조회. 주기 갱신은 heartbeat 응답으로 처리한다.
     */
    @GetMapping
    public JsonNode getPresence(HttpServletRequest request) {
        return presenceBffService.getSnapshot(request);
    }

    /**
     * 화면이 주기적으로 호출한다. 응답 본문이 곧 최신 snapshot이다.
     */
    @PostMapping("/heartbeat")
    public JsonNode heartbeat(HttpServletRequest request) {
        return presenceBffService.heartbeat(request);
    }

    /**
     * 탭 종료·이탈 통지. 화면은 응답을 기다리지 않는다.
     */
    @PostMapping("/leave")
    public ResponseEntity<Void> leave(HttpServletRequest request) {
        presenceBffService.leave(request);
        return ResponseEntity.noContent().build();
    }
}
