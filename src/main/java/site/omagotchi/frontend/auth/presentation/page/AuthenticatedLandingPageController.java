package site.omagotchi.frontend.auth.presentation.page;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;
import site.omagotchi.frontend.cohort.application.CohortAccessDecision;

// Login 성공 뒤 역할별 착지 화면 판정
@Controller
@RequiredArgsConstructor
public class AuthenticatedLandingPageController {

    private final CohortAccessDecision accessDecision;

    @GetMapping("/authenticated-landing")
    public String landing(HttpServletRequest request, Authentication authentication) {
        String globalLanding = AuthenticatedLandingPage.resolveGlobalRole(authentication);
        if (globalLanding != null) {
            return "redirect:" + globalLanding;
        }

        // 하류 판정 실패는 CohortAccessDecision이 일반 사용자로 강등한다.
        // Learning 장애가 Login 자체를 막지 않게 하는 유일한 지점이다.
        return accessDecision.isCohortManager(request)
                ? "redirect:/manager-dashboard"
                : "redirect:/home";
    }
}
