package site.omagotchi.frontend.auth.presentation.bff;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.auth.application.VerifiedSignupService;
import site.omagotchi.frontend.auth.application.result.EmailVerificationChallenge;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.presentation.bff.request.SignupEmailChallengeRequest;
import site.omagotchi.frontend.auth.presentation.bff.request.VerifiedSignupRequest;
import site.omagotchi.frontend.auth.presentation.bff.response.EmailVerificationChallengeResponse;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.ErrorCode;

@RestController
@RequiredArgsConstructor
@RequestMapping(AuthBffPaths.SIGNUP)
public class SignupBffController {

    private final VerifiedSignupService verifiedSignupService;

    @PostMapping("/email-otp")
    public ResponseEntity<EmailVerificationChallengeResponse>
            requestEmailVerification(
                    @Valid @RequestBody SignupEmailChallengeRequest request
            ) {
        EmailVerificationChallenge challenge = verifiedSignupService
                .requestEmailVerification(request.toCommand());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(EmailVerificationChallengeResponse.from(challenge));
    }

    @PostMapping
    public ResponseEntity<Void> signUp(
            @Valid @RequestBody VerifiedSignupRequest request
    ) {
        SignupResult result = verifiedSignupService.signUp(request.toCommand());
        return switch (result) {
            case SignupResult.Created ignored -> ResponseEntity
                    .status(HttpStatus.CREATED)
                    .cacheControl(CacheControl.noStore())
                    .build();
            case SignupResult.Rejected(ErrorCode errorCode) ->
                    throw new BusinessException(errorCode);
        };
    }
}
