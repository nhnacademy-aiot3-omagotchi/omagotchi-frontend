package site.omagotchi.frontend.presentation;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SystemAdminPageController {

    @GetMapping("/system-admin-dashboard")
    public String dashboard(Authentication authentication, Model model) {
        model.addAttribute("systemAdminIdentifier", authentication.getName());
        return "system-admin/dashboard/index";
    }
}
