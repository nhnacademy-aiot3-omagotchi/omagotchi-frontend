package site.omagotchi.frontend.auth.presentation.bff;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.auth.application.PasswordChangeService;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.presentation.bff.request.PasswordChangeRequest;
import site.omagotchi.frontend.auth.presentation.bff.response.EmailVerificationChallengeResponse;
import site.omagotchi.frontend.auth.presentation.security.BrowserSessionInvalidator;
import site.omagotchi.frontend.auth.presentation.security.IdentitySessionAuthorization;

@RestController
@RequiredArgsConstructor
@RequestMapping(AuthBffPaths.PASSWORD)
public class PasswordChangeBffController {

    private final PasswordChangeService passwordChangeService;
    private final IdentitySessionAuthorization sessionAuthorization;
    private final BrowserSessionInvalidator sessionInvalidator;

    @PostMapping("/email-otp")
    public ResponseEntity<EmailVerificationChallengeResponse>
            requestEmailVerification(HttpServletRequest request) {
        EmailVerificationChallenge challenge = passwordChangeService
                .requestEmailVerification(sessionAuthorization.bearerToken(request));
        return ResponseEntity.accepted()
                .cacheControl(CacheControl.noStore())
                .body(EmailVerificationChallengeResponse.from(challenge));
    }

    @PatchMapping
    public ResponseEntity<Void> changePassword(
            HttpServletRequest servletRequest,
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        passwordChangeService.changePassword(
                sessionAuthorization.bearerToken(servletRequest),
                request.toCommand()
        );
        sessionInvalidator.invalidate(servletRequest);
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
