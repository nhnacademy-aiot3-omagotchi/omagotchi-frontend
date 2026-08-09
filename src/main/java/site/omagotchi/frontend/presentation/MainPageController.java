package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainPageController {

    @GetMapping("/home")
    public String home() {
        return "pages/app/home";
    }

    @GetMapping("/space")
    public String space() {
        return "pages/app/space";
    }
}
