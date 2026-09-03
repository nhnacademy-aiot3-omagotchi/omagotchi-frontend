package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.account.application.AdminAuditBffService;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;
import site.omagotchi.frontend.account.presentation.response.AdminAuditResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/audits")
public class AdminAuditBffController {

    private final AdminAuditBffService service;
    private final AccountSessionAuthorization authorization;

    @GetMapping
    public PageResponse<AdminAuditResponse> getAudits(
            HttpServletRequest request,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        IdentityAdminAuditPage result = service.findAudits(
                authorization.accessToken(request),
                page,
                size
        );
        PageMetadata pageInfo = result.page();
        return new PageResponse<>(
                result.items().stream().map(AdminAuditResponse::from).toList(),
                new PageInfo(
                        pageInfo.number(),
                        pageInfo.size(),
                        pageInfo.totalElements(),
                        pageInfo.totalPages()
                )
        );
    }
}
