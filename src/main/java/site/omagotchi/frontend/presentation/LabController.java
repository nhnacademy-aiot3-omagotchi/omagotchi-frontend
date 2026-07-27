package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LabController {
    // 홈
    @GetMapping("/home")
    public String home() {
        return "home";
    }
    // 실습실
    @GetMapping("/lab")
    public String lab() {
        return "lab";
    }
    // 공간
    @GetMapping("/space")
    public String space() {
        return "space";
    }
}
