package site.omagotchi.frontend.auth.presentation.page;

import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import site.omagotchi.frontend.auth.application.AuthErrorCode;

import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;

// 일반 사용자 Login Page의 Server rendering
@Controller
public class LoginPageController {

    private static final String LOGIN_VIEW = "pages/auth/login";
    private static final String AUTH_FEEDBACK = "authFeedback";
    private static final String AUTH_FEEDBACK_TYPE = "authFeedbackType";

    @GetMapping("/login")
    public String loginPage(
            Model model,
            Authentication authentication,
            @RequestParam(required = false) String error
    ) {
        if (authentication != null) {
            return "redirect:" + AuthenticatedLandingPage.resolve(authentication);
        }
        if (error != null) {
            model.addAttribute(AUTH_FEEDBACK, AuthErrorCode.INVALID_CREDENTIALS.message());
            model.addAttribute(AUTH_FEEDBACK_TYPE, "error");
        }
        return LOGIN_VIEW;
    }
}
