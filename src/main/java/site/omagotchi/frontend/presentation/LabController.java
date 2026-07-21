package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LabController {
    @GetMapping("/lab")
    public String lab() {
        return "lab";
    }
}
