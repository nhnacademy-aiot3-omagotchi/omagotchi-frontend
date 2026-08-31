package site.omagotchi.frontend.auth.application.port;

import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

import java.util.Optional;

// 현재 요청의 세션 캐시와 분리된 브라우저 세션 토큰 저장소
public interface BrowserSessionTokenStore {

    // Redis 브라우저 세션에 유지되는 토큰 묶음 저장 키
    String SESSION_TOKEN_BUNDLE_ATTRIBUTE = "auth.tokenBundle";

    Optional<BrowserSessionTokenBundle> find(String sessionId);

    boolean save(String sessionId, BrowserSessionTokenBundle tokenBundle);
}
