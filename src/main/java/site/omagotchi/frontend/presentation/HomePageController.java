package site.omagotchi.frontend.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.ModelAndView;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;
import site.omagotchi.frontend.cohort.application.CohortAccessDecision;

@Controller
public class HomePageController {

    private static final String ADMIN_HOME_TITLE = "관리자 계정은 사용자 홈에 접근할 수 없습니다.";
    private static final String ADMIN_HOME_DESCRIPTION =
            "시스템 관리자 또는 기수 관리자 전용 화면을 이용해 주세요.";

    private final CohortAccessDecision accessDecision;

    public HomePageController(CohortAccessDecision accessDecision) {
        this.accessDecision = accessDecision;
    }

    @GetMapping("/home")
    public ModelAndView home(
            HttpServletRequest request,
            Authentication authentication
    ) {
        // 시스템 관리자는 시스템 관리자 Dashboard만 사용한다.
        // 전역 권한은 Session Authentication에 있으므로 Learning 조회를 추가하지 않는다.
        if (AuthenticatedLandingPage.resolveGlobalRole(authentication) != null
                || accessDecision.isCohortManager(request)) {
            return forbiddenForAdmin();
        }

        return new ModelAndView("pages/app/home");
    }

    private ModelAndView forbiddenForAdmin() {
        ModelAndView modelAndView = new ModelAndView("error/403");
        modelAndView.setStatus(HttpStatus.FORBIDDEN);
        modelAndView.addObject("errorTitle", ADMIN_HOME_TITLE);
        modelAndView.addObject("errorDescription", ADMIN_HOME_DESCRIPTION);
        return modelAndView;
    }
}
