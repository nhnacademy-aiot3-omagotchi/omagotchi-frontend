package site.omagotchi.frontend.global.http;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PageResponseContractValidatorTest {

    @Test
    @DisplayName("공통 items·page 계약을 만족하는 페이지 허용")
    void acceptsPageThatSatisfiesCommonContract() {
        // Given: 항목 수와 전체 페이지 수가 일관된 페이지 응답
        PageResponse<String> response = new PageResponse<>(
                List.of("first", "second"),
                new PageInfo(0, 2, 3, 2)
        );

        // When: 공통 페이지 계약 검증
        PageResponse<String> validated =
                PageResponseContractValidator.requireValid(response, "테스트 조회");

        // Then: 원래 페이지 응답 반환
        assertThat(validated).isSameAs(response);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidResponses")
    @DisplayName("잘못된 공통 items·page 계약 거부")
    void rejectsInvalidPageResponse(
            String ignoredDescription,
            PageResponse<?> response
    ) {
        // Given: 설명으로 구분되는 잘못된 공통 페이지 응답
        // When & Then: 잘못된 하류 응답 오류로 거부
        assertInvalid(response);
    }

    @Test
    @DisplayName("생성 후 items 변경 방지")
    void protectsItemsFromMutationAfterConstruction() {
        // Given: 변경 가능한 원본 목록으로 생성한 페이지 응답
        List<String> items = new ArrayList<>(List.of("item"));
        PageResponse<String> response = new PageResponse<>(
                items,
                new PageInfo(0, 20, 1, 1)
        );

        // When: 원본 목록 변경
        items.clear();

        // Then: 페이지 항목 불변성과 외부 변경 차단
        assertThat(response.items()).containsExactly("item");
        assertThatThrownBy(() -> response.items().add("other"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    private static Stream<Arguments> invalidResponses() {
        return Stream.of(
                Arguments.of(
                        "items 누락",
                        new PageResponse<>(null, new PageInfo(0, 20, 0, 0))
                ),
                Arguments.of(
                        "page 누락",
                        new PageResponse<>(List.of(), null)
                ),
                Arguments.of(
                        "음수 페이지 번호",
                        new PageResponse<>(List.of("item"), new PageInfo(-1, 20, 1, 1))
                ),
                Arguments.of(
                        "0인 페이지 크기",
                        new PageResponse<>(List.of("item"), new PageInfo(0, 0, 1, 1))
                ),
                Arguments.of(
                        "항목이 있지만 전체 건수가 0",
                        new PageResponse<>(List.of("item"), new PageInfo(0, 20, 0, 0))
                ),
                Arguments.of(
                        "전체 건수와 전체 페이지 수 불일치",
                        new PageResponse<>(List.of("item"), new PageInfo(0, 20, 21, 1))
                )
        );
    }

    private static void assertInvalid(PageResponse<?> response) {
        assertThatThrownBy(() -> PageResponseContractValidator.requireValid(
                response,
                "테스트 조회"
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
