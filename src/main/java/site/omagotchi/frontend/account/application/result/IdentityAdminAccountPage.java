package site.omagotchi.frontend.account.application.result;

import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.util.List;
import java.util.Objects;

public record IdentityAdminAccountPage(
        List<IdentityAdminAccount> items,
        PageMetadata page
) {

    public IdentityAdminAccountPage {
        items = items == null ? List.of() : List.copyOf(items);
        page = Objects.requireNonNull(page, "page");
    }
}
