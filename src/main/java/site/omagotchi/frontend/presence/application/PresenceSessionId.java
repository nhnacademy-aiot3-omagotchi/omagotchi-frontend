package site.omagotchi.frontend.presence.application;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.learning.application.LearningBffErrorCode;

import java.util.UUID;

/**
 * Presence 세션 식별자 확보의 단일 지점.
 *
 * <p>Browser는 이 값을 보지도 보내지도 않는다. View가 생성해 Spring Session에 보관하고
 * 하류 호출 Header에만 싣는다. {@code LearningCohortContext}가 cohortId를 다루는 방식과 같다.
 *
 * <p>같은 브라우저의 여러 탭은 같은 Session을 공유하므로 자연히 재실 1명으로 집계된다.
 * 로그아웃 시 Session이 무효화되면서 이 값도 함께 사라져 heartbeat가 끊긴다.
 */
@Component
public class PresenceSessionId {

    private static final String SESSION_ATTRIBUTE = PresenceSessionId.class.getName();

    public String resolve(HttpServletRequest request) {
        // Session을 새로 만들지 않는다. 인증된 요청이면 이미 존재한다.
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new BusinessException(LearningBffErrorCode.SESSION_TOKEN_MISSING);
        }

        Object cached = session.getAttribute(SESSION_ATTRIBUTE);
        if (cached instanceof String presenceSessionId) {
            return presenceSessionId;
        }

        // 여러 탭이 동시에 최초 heartbeat를 보내면 서로 다른 값을 만들 수 있다.
        // Learning은 사용자 단위 Set으로 세션을 모으므로 재실 인원은 그대로 1명이고,
        // 남는 쪽은 TTL로 사라진다. 분산 락을 둘 만한 문제가 아니다.
        String presenceSessionId = UUID.randomUUID().toString();
        session.setAttribute(SESSION_ATTRIBUTE, presenceSessionId);
        return presenceSessionId;
    }
}
