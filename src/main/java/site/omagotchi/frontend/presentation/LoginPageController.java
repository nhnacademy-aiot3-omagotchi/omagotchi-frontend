package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginPageController {
    // 사용자 로그인 화면
    @GetMapping("/login")
    public String loginPage() {
        return "pages/auth/login";
    }
    // 비밀번호 변경
    @GetMapping("/password-change")
    public String passwordChangePage() {
        return "pages/auth/passwordChange";
    }
}
