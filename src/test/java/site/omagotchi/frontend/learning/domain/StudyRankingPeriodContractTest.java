package site.omagotchi.frontend.learning.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * StudyRankingPeriod는 learning-service가 소유하고 view가 복제한다.
 * 저장소가 분리되어 컴파일러가 일치를 보장하지 못하므로 테스트로 계약을 고정한다.
 */
class StudyRankingPeriodContractTest {

    // learning-service의 StudyRankingPeriod 정의를 문자열로 고정한 것
    private static final List<String> LEARNING_CONTRACT = List.of("DAILY", "WEEKLY", "MONTHLY");

    @Test
    @DisplayName("learning-service의 집계 기간과 동일한 값을 같은 순서로 가진다")
    void matchesLearningServiceContract() {
        List<String> actual = Arrays.stream(StudyRankingPeriod.values())
                .map(Enum::name)
                .toList();

        assertThat(actual)
                .as("learning-service의 StudyRankingPeriod와 불일치. "
                        + "값이 추가·변경되었다면 view의 Enum과 이 계약을 함께 갱신해야 한다.")
                .isEqualTo(LEARNING_CONTRACT);
    }
}
