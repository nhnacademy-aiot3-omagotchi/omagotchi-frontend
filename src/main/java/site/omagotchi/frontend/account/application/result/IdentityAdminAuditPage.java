package site.omagotchi.frontend.account.application.result;

import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.util.List;

public record IdentityAdminAuditPage(
        List<IdentityAdminAudit> items,
        PageMetadata page
) {

    public IdentityAdminAuditPage {
        items = List.copyOf(items);
    }
}
