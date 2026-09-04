package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.account.application.AccountSettingsBffService;
import site.omagotchi.frontend.account.presentation.request.ChangeAccountPasswordRequest;
import site.omagotchi.frontend.account.presentation.request.UpdateAccountNameRequest;
import site.omagotchi.frontend.account.presentation.request.WithdrawAccountRequest;
import site.omagotchi.frontend.account.presentation.response.AccountSettingsResponse;
import site.omagotchi.frontend.account.presentation.response.AccountWithdrawalResponse;
import site.omagotchi.frontend.global.security.BrowserSessionInvalidator;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/users/me")
public class AccountSettingsBffController {

    private final AccountSettingsBffService accountSettingsService;
    private final AccountSessionAuthorization authorization;
    private final BrowserSessionInvalidator sessionInvalidator;

    @GetMapping
    public ResponseEntity<AccountSettingsResponse> getCurrentAccount(
            HttpServletRequest servletRequest
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(AccountSettingsResponse.from(
                        accountSettingsService.getCurrentAccount(
                                authorization.accessToken(servletRequest)
                        )
                ));
    }

    @PatchMapping
    public ResponseEntity<Void> changeName(
            HttpServletRequest servletRequest,
            @Valid @RequestBody UpdateAccountNameRequest request
    ) {
        accountSettingsService.changeName(
                authorization.accessToken(servletRequest),
                request.name()
        );
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse,
            Authentication authentication,
            @Valid @RequestBody ChangeAccountPasswordRequest request
    ) {
        accountSettingsService.changePassword(
                authorization.accessToken(servletRequest),
                request.currentPassword(),
                request.newPassword()
        );
        // TODO: 비밀번호 변경 후 현재 브라우저 로그인 유지
        // - 다른 브라우저의 Refresh Token 계열 폐기
        // - 현재 브라우저용 Access·Refresh Token 재발급과 세션 저장값 교체
        sessionInvalidator.invalidate(
                servletRequest,
                servletResponse,
                authentication
        );
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }

    @DeleteMapping
    public ResponseEntity<AccountWithdrawalResponse> withdraw(
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse,
            Authentication authentication,
            @Valid @RequestBody WithdrawAccountRequest request
    ) {
        AccountWithdrawalResponse response = new AccountWithdrawalResponse(
                accountSettingsService.withdraw(
                        authorization.accessToken(servletRequest),
                        request.currentPassword()
                )
        );
        // Identity 탈퇴 성공 뒤 현재 브라우저 인증 상태 폐기
        sessionInvalidator.invalidate(
                servletRequest,
                servletResponse,
                authentication
        );
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
