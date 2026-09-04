package site.omagotchi.frontend.auth.presentation.page;

import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

// 일반 사용자 로그인 페이지의 서버 렌더링
@Controller
public class LoginPageController {

    private static final String LOGIN_VIEW = "pages/auth/login";
    private static final String AUTH_FEEDBACK = "authFeedback";
    private static final String AUTH_FEEDBACK_TYPE = "authFeedbackType";
    private static final DateTimeFormatter RECOVERY_DEADLINE_FORMAT = DateTimeFormatter
            .ofPattern("yyyy년 M월 d일 HH:mm")
            .withZone(ZoneId.of("Asia/Seoul"));
    private static final Map<String, LoginNotice> LOGIN_NOTICES = Map.of(
            "password-changed",
            new LoginNotice(
                    "비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.",
                    "success"
            ),
            "password-reset",
            new LoginNotice(
                    "비밀번호를 재설정했습니다. 새 비밀번호로 로그인해 주세요.",
                    "success"
            ),
            "account-withdrawn",
            new LoginNotice(
                    "계정 탈퇴를 완료했습니다.",
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
            @RequestParam(required = false) String notice,
            @RequestParam(required = false) String recoveryDeadline
    ) {
        if (authentication != null) {
            return "redirect:" + AuthenticatedLandingPage.resolve(authentication);
        }

        LoginNotice loginNotice = resolveNotice(notice, recoveryDeadline);
        if (error != null) {
            model.addAttribute(AUTH_FEEDBACK, AuthErrorCode.INVALID_CREDENTIALS.message());
            model.addAttribute(AUTH_FEEDBACK_TYPE, "error");
        } else if (loginNotice != null) {
            model.addAttribute(AUTH_FEEDBACK, loginNotice.message());
            model.addAttribute(AUTH_FEEDBACK_TYPE, loginNotice.type());
        }
        return LOGIN_VIEW;
    }

    private static LoginNotice resolveNotice(String notice, String recoveryDeadline) {
        LoginNotice base = notice == null ? null : LOGIN_NOTICES.get(notice);
        if (base == null || !"account-withdrawn".equals(notice) || recoveryDeadline == null) {
            return base;
        }
        try {
            Instant deadline = Instant.parse(recoveryDeadline);
            return new LoginNotice(
                    "계정 탈퇴를 완료했습니다. "
                            + RECOVERY_DEADLINE_FORMAT.format(deadline)
                            + "까지 같은 이메일 인증으로 계정과 공부 기록을 복구할 수 있습니다.",
                    "success"
            );
        } catch (DateTimeException ignored) {
            return base;
        }
    }

    private record LoginNotice(String message, String type) {
    }
}
