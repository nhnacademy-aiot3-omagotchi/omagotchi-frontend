package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ManagerPageController {
    // 관리자 대시보드
    @GetMapping("/manager-dashboard")
    public String managerDashboardPage() {
        return "pages/manager/managerDashboard";
    }
}
