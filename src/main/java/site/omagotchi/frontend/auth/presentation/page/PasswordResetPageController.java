package site.omagotchi.frontend.auth.presentation.page;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// 공개 비밀번호 재설정 Page의 Server rendering
@Controller
public class PasswordResetPageController {

    private static final String PASSWORD_RESET_VIEW = "pages/auth/passwordReset";

    // 비밀번호 재설정 Page 반환
    @GetMapping("/password-reset")
    public String passwordResetPage() {
        return PASSWORD_RESET_VIEW;
    }

    // 기존 비밀번호 변경 안내 경로의 정식 재설정 경로 Redirect
    @GetMapping("/password-change")
    public String redirectLegacyPasswordChangePage() {
        return "redirect:/password-reset";
    }
}
