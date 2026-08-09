package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CheckInController {

    @GetMapping("/check-in")
    public String checkIn() {
        return "pages/onboarding/check-in";
    }
}
