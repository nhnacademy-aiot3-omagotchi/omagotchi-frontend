package site.omagotchi.frontend.auth.presentation.page;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.global.exception.ErrorCode;
import site.omagotchi.frontend.global.exception.ErrorHttpMapper;

import java.security.Principal;

// 일반 사용자 Signup Form의 Server rendering과 가입 처리
@Controller
@RequiredArgsConstructor
public class SignupPageController {

    private static final String REGISTER_VIEW = "pages/auth/register";
    private static final String AUTH_FEEDBACK = "authFeedback";

    private final AuthenticationService authenticationService;

    @GetMapping("/register")
    public String registerPage(
            Model model,
            Principal principal
    ) {
        if (principal != null) {
            return "redirect:/home";
        }
        if (!model.containsAttribute("signupForm")) {
            model.addAttribute("signupForm", new SignupForm());
        }
        return REGISTER_VIEW;
    }

    @PostMapping("/register")
    public String register(
            @Valid @ModelAttribute("signupForm") SignupForm form,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes,
            Principal principal,
            HttpServletResponse response
    ) {
        if (principal != null) {
            return "redirect:/home";
        }
        if (bindingResult.hasErrors()) {
            // Form Binding 입력 오류의 400 응답
            form.setPassword(null);
            String message = bindingResult.getAllErrors().stream()
                    .findFirst()
                    .map(DefaultMessageSourceResolvable::getDefaultMessage)
                    .orElse("입력 내용을 다시 확인해주세요.");
            model.addAttribute(AUTH_FEEDBACK, message);
            response.setStatus(HttpStatus.BAD_REQUEST.value());
            return REGISTER_VIEW;
        }

        SignupResult result = authenticationService.signUp(
                form.getEmail(),
                form.getPassword(),
                form.getName()
        );
        switch (result) {
            case SignupResult.Created ignored -> {
                redirectAttributes.addFlashAttribute(
                        AUTH_FEEDBACK,
                        "계정이 생성됐습니다. 로그인해주세요."
                );
                return "redirect:/login";
            }
            case SignupResult.Rejected(ErrorCode rejectionCode) -> {
                // Identity 가입 거절의 비밀번호 제외 Form 복구
                form.setPassword(null);
                model.addAttribute(AUTH_FEEDBACK, rejectionCode.message());
                response.setStatus(ErrorHttpMapper.toHttpStatus(rejectionCode.type()).value());
                return REGISTER_VIEW;
            }
        }
    }
}
