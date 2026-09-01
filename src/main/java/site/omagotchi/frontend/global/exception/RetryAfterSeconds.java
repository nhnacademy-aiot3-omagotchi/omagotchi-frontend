package site.omagotchi.frontend.global.exception;

// Browser Retry-After Header에 사용할 양의 초 단위 대기 시간
public record RetryAfterSeconds(long value) {

    public RetryAfterSeconds {
        if (value < 1) {
            throw new IllegalArgumentException(
                    "Retry-After 대기 시간은 1초 이상이어야 합니다."
            );
        }
    }

    public String headerValue() {
        return Long.toString(value);
    }
}
