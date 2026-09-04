package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.account.application.AdminAccountBffService;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.presentation.request.ChangeAccountRoleRequest;
import site.omagotchi.frontend.account.presentation.request.ChangeAccountStatusRequest;
import site.omagotchi.frontend.account.presentation.request.LoginUnlockRequest;
import site.omagotchi.frontend.account.presentation.response.AdminAccountResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/users")
public class AdminAccountBffController {

    private final AdminAccountBffService adminAccountBffService;
    private final AccountSessionAuthorization authorization;

    @GetMapping
    public PageResponse<AdminAccountResponse> getUsers(
            HttpServletRequest request,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean locked,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    ) {
        AdminAccountPage result = adminAccountBffService.findAccounts(
                authorization.accessToken(request),
                query,
                status,
                locked,
                role,
                page,
                size,
                sort
        );
        PageMetadata pageInfo = result.page();
        return new PageResponse<>(
                result.items().stream().map(AdminAccountResponse::from).toList(),
                new PageInfo(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }

    @PostMapping("/{user-id}/login-lock/unlock")
    public ResponseEntity<Void> unlockLogin(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @Valid @RequestBody LoginUnlockRequest body
    ) {
        adminAccountBffService.unlockLogin(
                authorization.accessToken(request),
                userId,
                body.reason()
        );
        return ResponseEntity.noContent().build();
    }

    /**
     * 계정 상태 변경.
     *
     * <p>ACTIVE와 DISABLED만 Identity가 받는다. 로그인 잠금은 별도 속성이고,
     * WITHDRAWN은 관리자가 직접 지정할 수 없어 화면 선택지에서도 제외한다.</p>
     */
    @PatchMapping("/{user-id}/status")
    public ResponseEntity<Void> changeAccountStatus(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @Valid @RequestBody ChangeAccountStatusRequest body
    ) {
        adminAccountBffService.changeAccountStatus(
                authorization.accessToken(request),
                userId,
                body.status().name(),
                body.reason()
        );
        return ResponseEntity.noContent().build();
    }

    /**
     * 전역 역할 변경.
     *
     * <p>USER와 SYSTEM_ADMIN만 Identity가 받는다. 기수 관리자는 전역 역할이 아니라
     * Learning의 기수 배정이므로 아래 managed-cohorts 경로로 간다.</p>
     */
    @PatchMapping("/{user-id}/role")
    public ResponseEntity<Void> changeAccountRole(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @Valid @RequestBody ChangeAccountRoleRequest body
    ) {
        adminAccountBffService.changeAccountRole(
                authorization.accessToken(request),
                userId,
                body.role().name(),
                body.reason()
        );
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void assignManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        adminAccountBffService.assignManager(
                authorization.accessToken(request), userId, cohortId);
    }

    @DeleteMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void removeManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        adminAccountBffService.removeManager(
                authorization.accessToken(request), userId, cohortId);
    }
}
