package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LabController {
    // 홈 -> 실습실로 대체 예정
    @GetMapping("/home")
    public String home() {
        return "home";
    }
}
