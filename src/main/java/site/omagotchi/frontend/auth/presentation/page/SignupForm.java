package site.omagotchi.frontend.auth.presentation.page;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

// Signup HTML Form의 필수 필드와 기본 이메일 형식
@Getter
public class SignupForm {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    private String email;

    @Setter
    @NotEmpty(message = "비밀번호는 필수입니다.")
    private String password;

    @NotBlank(message = "이름은 필수입니다.")
    private String name;

    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }

    public void setName(String name) {
        this.name = name == null ? null : name.trim();
    }

    @Override
    public String toString() {
        return "SignupForm[sensitive fields redacted]";
    }
}
