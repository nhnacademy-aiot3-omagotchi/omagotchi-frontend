package site.omagotchi.frontend.presentation;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SystemAdminPageController {

    // 사용자 식별자는 서버에서 렌더하지 않는다.
    // 표시용 이름은 Browser 가 /bff/v1/users/me 로 가져온다.
    @GetMapping("/system-admin-dashboard")
    public String dashboard() {
        return "system-admin/dashboard/index";
    }
}
