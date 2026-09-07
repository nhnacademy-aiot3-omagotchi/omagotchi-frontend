package site.omagotchi.frontend.auth.presentation.bff;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.auth.application.PasswordResetBffService;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.presentation.bff.request.PasswordResetEmailChallengeRequest;
import site.omagotchi.frontend.auth.presentation.bff.request.PasswordResetRequest;
import site.omagotchi.frontend.auth.presentation.bff.response.EmailVerificationChallengeResponse;

// 익명 Browser용 비밀번호 재설정 v2 계약
@RestController
@RequiredArgsConstructor
@RequestMapping(PasswordResetBffPaths.PASSWORD_RESET)
public class PasswordResetBffController {

    private final PasswordResetBffService passwordResetBffService;

    // 비밀번호 재설정용 이메일 OTP 발급
    @PostMapping("/email-otp")
    public ResponseEntity<EmailVerificationChallengeResponse> requestEmailVerification(
            @Valid @RequestBody PasswordResetEmailChallengeRequest request
    ) {
        // TODO 공개 OTP 발급 악용 방지를 위한 CAPTCHA 검증 추가
        EmailVerificationChallenge challenge = passwordResetBffService
                .requestEmailVerification(request.toCommand());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .cacheControl(CacheControl.noStore())
                .body(EmailVerificationChallengeResponse.from(challenge));
    }

    // OTP 검증 및 비밀번호 재설정 완료
    @PatchMapping
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody PasswordResetRequest request
    ) {
        passwordResetBffService.resetPassword(request.toCommand());
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
