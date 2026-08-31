package site.omagotchi.frontend.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;
import site.omagotchi.frontend.cohort.application.CohortAccessDecision;

@Controller
@RequiredArgsConstructor
public class ManagerDashboardPageController {

    private final CohortAccessDecision accessDecision;

    @GetMapping("/manager-dashboard")
    public String dashboard(HttpServletRequest request, Authentication authentication) {
        String globalLanding = AuthenticatedLandingPage.resolveGlobalRole(authentication);
        if (globalLanding != null) {
            return "redirect:" + globalLanding;
        }
        // 판정 불가는 접근 거부와 동일하게 처리한다.
        if (!accessDecision.isCohortManager(request)) {
            return "redirect:/home";
        }
        return "manager/dashboard/index";
    }
}
