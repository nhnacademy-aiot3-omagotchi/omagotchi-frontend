package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ManagerPageController {
    @GetMapping("/managerLogin")
    public String managerLoginPage() {
        return "managerLogin";
    }

    @GetMapping("/managerRegister")
    public String managerRegisterPage() {
        return "managerRegister";
    }
}
