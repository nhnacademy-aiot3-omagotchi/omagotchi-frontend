package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ManagerPageController {
    // 관리자 로그인
    @GetMapping("/managerLogin")
    public String managerLoginPage() {
        return "managerLogin";
    }
    // 관리자 회원가입
    @GetMapping("/managerRegister")
    public String managerRegisterPage() {
        return "managerRegister";
    }
    // 관리자 대시보드
    @GetMapping("/managerDashboard")
    public String managerDashboardPage() {
        return "managerDashboard";
    }
}
