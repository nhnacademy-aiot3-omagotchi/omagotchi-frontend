package site.omagotchi.frontend.auth.presentation.page;

import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;

import java.util.Map;

// 일반 사용자 Login Page의 Server rendering
@Controller
public class LoginPageController {

    private static final String LOGIN_VIEW = "pages/auth/login";
    private static final String AUTH_FEEDBACK = "authFeedback";
    private static final String AUTH_FEEDBACK_TYPE = "authFeedbackType";
    private static final Map<String, LoginNotice> LOGIN_NOTICES = Map.of(
            "password-changed",
            new LoginNotice(
                    "비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.",
                    "success"
            ),
            "session-expired",
            new LoginNotice(
                    "로그인 시간이 만료되었습니다. 다시 로그인해 주세요.",
                    "error"
            )
    );

    @GetMapping("/login")
    public String loginPage(
            Model model,
            Authentication authentication,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String notice
    ) {
        if (authentication != null) {
            return "redirect:" + AuthenticatedLandingPage.resolve(authentication);
        }

        LoginNotice loginNotice = notice == null ? null : LOGIN_NOTICES.get(notice);
        if (error != null) {
            model.addAttribute(AUTH_FEEDBACK, AuthErrorCode.INVALID_CREDENTIALS.message());
            model.addAttribute(AUTH_FEEDBACK_TYPE, "error");
        } else if (loginNotice != null) {
            model.addAttribute(AUTH_FEEDBACK, loginNotice.message());
            model.addAttribute(AUTH_FEEDBACK_TYPE, loginNotice.type());
        }
        return LOGIN_VIEW;
    }

    private record LoginNotice(String message, String type) {
    }
}
