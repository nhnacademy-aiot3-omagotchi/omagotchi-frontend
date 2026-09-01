package site.omagotchi.frontend.account;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import site.omagotchi.frontend.account.infrastructure.request.IdentityChangePasswordRequest;
import site.omagotchi.frontend.account.infrastructure.request.IdentityWithdrawAccountRequest;
import site.omagotchi.frontend.account.presentation.request.ChangeAccountPasswordRequest;
import site.omagotchi.frontend.account.presentation.request.WithdrawAccountRequest;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class AccountPasswordRequestRedactionTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("passwordChangeRequests")
    @DisplayName("계정 변경 요청 문자열의 비밀번호 비노출")
    void redactsPasswordsFromStringRepresentation(
            String ignoredDescription,
            Object request
    ) {
        // Given: 비밀번호를 포함한 계정 변경 요청
        // When: 요청 문자열 변환
        String rendered = request.toString();

        // Then: 비밀번호 원문 비노출과 마스킹 표시
        assertThat(rendered)
                .contains("sensitive fields redacted")
                .doesNotContain("current-password-value")
                .doesNotContain("new-password-value");
    }

    private static Stream<Arguments> passwordChangeRequests() {
        return Stream.of(
                Arguments.of(
                        "브라우저 BFF 요청",
                        new ChangeAccountPasswordRequest(
                                "current-password-value",
                                "new-password-value"
                        )
                ),
                Arguments.of(
                        "Identity 하류 요청",
                        new IdentityChangePasswordRequest(
                                "current-password-value",
                                "new-password-value"
                        )
                ),
                Arguments.of(
                        "브라우저 BFF 계정 탈퇴 요청",
                        new WithdrawAccountRequest("current-password-value")
                ),
                Arguments.of(
                        "Identity 하류 계정 탈퇴 요청",
                        new IdentityWithdrawAccountRequest("current-password-value")
                )
        );
    }
}
