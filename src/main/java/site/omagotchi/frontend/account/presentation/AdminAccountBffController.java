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

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/users")
public class AdminAccountBffController {

    private final AdminAccountBffService service;

    @GetMapping
    public AdminAccountPage getUsers(
            HttpServletRequest request,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort
    ) {
        return service.findAccounts(request, query, status, role, page, size, sort);
    }

    @PutMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void assignManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        service.assignManager(request, userId, cohortId);
    }

    @DeleteMapping("/{user-id}/managed-cohorts/{cohort-id}")
    public void removeManager(
            HttpServletRequest request,
            @PathVariable("user-id") UUID userId,
            @PathVariable("cohort-id") Long cohortId
    ) {
        service.removeManager(request, userId, cohortId);
    }
}
