package site.omagotchi.frontend.auth.presentation.page;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.security.Principal;

// 일반 사용자 Signup Form의 Server rendering
@Controller
public class SignupPageController {

    private static final String REGISTER_VIEW = "pages/auth/register";

    @GetMapping("/register")
    public String registerPage(
            Model model,
            Principal principal
    ) {
        if (principal != null) {
            return "redirect:/home";
        }
        if (!model.containsAttribute("signupForm")) {
            model.addAttribute("signupForm", new SignupForm());
        }
        return REGISTER_VIEW;
    }
}
