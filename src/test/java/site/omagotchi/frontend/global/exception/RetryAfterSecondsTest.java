package site.omagotchi.frontend.global.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class RetryAfterSecondsTest {

    @Test
    @DisplayName("1초를 유효한 최소 재시도 대기 시간으로 생성")
    void acceptsOneSecond() {
        assertThat(new RetryAfterSeconds(1).headerValue()).isEqualTo("1");
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1})
    @DisplayName("0 이하의 재시도 대기 시간 생성 거부")
    void rejectsNonPositiveSeconds(long seconds) {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new RetryAfterSeconds(seconds));
    }
}
