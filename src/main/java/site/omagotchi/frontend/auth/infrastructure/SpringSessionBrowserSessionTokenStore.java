package site.omagotchi.frontend.auth.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.global.session.SessionStoreFailures;

import java.util.Optional;
import java.util.function.Supplier;

// Redis에 저장된 최신 브라우저 세션 토큰 조회·교체
@Component
@RequiredArgsConstructor
public class SpringSessionBrowserSessionTokenStore implements BrowserSessionTokenStore {

    private final SessionRepository<? extends Session> sessionRepository;

    @Override
    public Optional<BrowserSessionTokenBundle> find(String sessionId) {
        // 현재 요청에 캐시된 값 대신 저장소의 최신 세션 조회
        return executeStoreOperation(() -> findTokenBundle(sessionRepository, sessionId));
    }

    @Override
    public boolean save(
            String sessionId,
            BrowserSessionTokenBundle tokenBundle
    ) {
        // 저장 직전 세션 존재 여부 재확인과 토큰 묶음 교체
        return executeStoreOperation(() ->
                saveTokenBundle(sessionRepository, sessionId, tokenBundle)
        );
    }

    private static <T> T executeStoreOperation(Supplier<T> operation) {
        try {
            return operation.get();
        } catch (RuntimeException exception) {
            if (SessionStoreFailures.isFailure(exception)) {
                throw new BrowserSessionStoreUnavailableException(exception);
            }
            throw exception;
        }
    }

    private static <S extends Session> Optional<BrowserSessionTokenBundle> findTokenBundle(
            SessionRepository<S> repository,
            String sessionId
    ) {
        S session = repository.findById(sessionId);
        if (session == null) {
            return Optional.empty();
        }
        Object attribute = session.getAttribute(SESSION_TOKEN_BUNDLE_ATTRIBUTE);
        return attribute instanceof BrowserSessionTokenBundle tokenBundle
                ? Optional.of(tokenBundle)
                : Optional.empty();
    }

    private static <S extends Session> boolean saveTokenBundle(
            SessionRepository<S> repository,
            String sessionId,
            BrowserSessionTokenBundle tokenBundle
    ) {
        S session = repository.findById(sessionId);
        if (session == null) {
            return false;
        }
        session.setAttribute(SESSION_TOKEN_BUNDLE_ATTRIBUTE, tokenBundle);
        repository.save(session);
        return true;
    }
}
