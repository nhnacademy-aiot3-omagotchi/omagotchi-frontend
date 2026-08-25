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
     * 브라우저 Session 전체의 명시적 이탈 통지. 일반 탭 pagehide에서는 호출하지 않는다.
     */
    @PostMapping("/leave")
    public ResponseEntity<Void> leave(HttpServletRequest request) {
        presenceBffService.leave(request);
        return ResponseEntity.noContent().build();
    }
}
