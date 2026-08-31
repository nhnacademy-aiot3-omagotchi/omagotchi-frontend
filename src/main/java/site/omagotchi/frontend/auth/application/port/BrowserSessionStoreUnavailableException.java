package site.omagotchi.frontend.auth.application.port;

import java.util.Objects;

// 브라우저 세션 조회·저장 실패를 구분하기 위한 예외
public final class BrowserSessionStoreUnavailableException extends RuntimeException {

    public BrowserSessionStoreUnavailableException(Throwable cause) {
        super("Browser Session 저장소를 사용할 수 없습니다.", Objects.requireNonNull(cause, "cause"));
    }
}
