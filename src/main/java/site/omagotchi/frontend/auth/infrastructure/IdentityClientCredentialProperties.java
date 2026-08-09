package site.omagotchi.frontend.auth.infrastructure;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;

// Identity 호출 시 Frontend 프로세스를 증명하는 HTTP Basic 자격 증명
// 잘못된 공유 자격 증명의 기동 시점 거절
@Validated
@ConfigurationProperties(prefix = "clients.identity")
public record IdentityClientCredentialProperties(

        @NotBlank(message = "clients.identity.username은 필수입니다.")
        @Pattern(regexp = "^[^:]*$", message = "clients.identity.username에는 ':'를 사용할 수 없습니다.")
        String username,

        @NotBlank(message = "clients.identity.password는 필수입니다.")
        String password
) {

    @AssertTrue(message = "clients.identity.password는 32자 이상이어야 합니다.")
    public boolean isPasswordLengthValid() {
        return password == null
                || password.codePointCount(0, password.length()) >= 32;
    }

    @AssertTrue(message = "clients.identity.password는 UTF-8 기준 72바이트 이하여야 합니다.")
    public boolean isPasswordByteLengthValid() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    @Override
    public String toString() {
        // 설정 객체 로그 출력 시 password 마스킹
        return "IdentityClientCredentialProperties[username=" + username
                + ", password=[REDACTED]]";
    }
}
