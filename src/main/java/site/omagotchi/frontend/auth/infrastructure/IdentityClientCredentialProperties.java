package site.omagotchi.frontend.auth.infrastructure;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

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

    // 거부된 Credential 원문을 Binding 오류의 rejected value에 남기지 않는 파생값 검증
    @AssertTrue(message = "clients.identity.password는 32자 이상 72자 이하여야 합니다.")
    public boolean isPasswordLengthValid() {
        return password == null || password.length() >= 32 && password.length() <= 72;
    }

    // 환경 변수와 HTTP Basic 전송에 안전한 ASCII 난수 문자 범위
    @AssertTrue(message = "clients.identity.password는 영문자·숫자·'-'·'_'만 사용할 수 있습니다.")
    public boolean isPasswordCharacterSetValid() {
        return password == null || password.matches("[A-Za-z0-9_-]+");
    }

    @Override
    public String toString() {
        // 설정 객체 로그 출력 시 password 마스킹
        return "IdentityClientCredentialProperties[username=" + username
                + ", password=[REDACTED]]";
    }
}
