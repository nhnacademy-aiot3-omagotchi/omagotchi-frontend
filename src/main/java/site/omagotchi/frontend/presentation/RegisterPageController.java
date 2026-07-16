package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RegisterPageController {
    // 사용자 회원가입
    @GetMapping("/register")
    public String registerPage() {
        return "register";
    }
}
