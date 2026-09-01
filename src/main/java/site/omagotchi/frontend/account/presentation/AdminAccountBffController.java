package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.account.application.AdminAccountBffService;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.presentation.response.AdminAccountResponse;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/users")
public class AdminAccountBffController {

    private final AdminAccountBffService service;
    private final AccountSessionAuthorization authorization;

    @GetMapping
    public PageResponse<AdminAccountResponse> getUsers(
            HttpServletRequest request,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    ) {
        AdminAccountPage result = service.findAccounts(
                authorization.accessToken(request),
                query,
                status,
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

    @PutMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void assignManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        service.assignManager(authorization.accessToken(request), userId, cohortId);
    }

    @DeleteMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void removeManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        service.removeManager(authorization.accessToken(request), userId, cohortId);
    }
}
