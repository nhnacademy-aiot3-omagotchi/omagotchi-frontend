package site.omagotchi.frontend.auth.application.port;

import java.util.function.Supplier;

// 같은 브라우저 세션의 중복 토큰 갱신 방지
public interface BrowserSessionRefreshLock {

    <T> T execute(String sessionId, Supplier<T> operation);
}
