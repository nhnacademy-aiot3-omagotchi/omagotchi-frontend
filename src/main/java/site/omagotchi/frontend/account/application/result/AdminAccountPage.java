package site.omagotchi.frontend.account.application.result;

import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.util.List;
import java.util.Objects;

public record AdminAccountPage(
        List<AdminAccountView> items,
        PageMetadata page
) {

    public AdminAccountPage {
        items = items == null ? List.of() : List.copyOf(items);
        page = Objects.requireNonNull(page, "page");
    }
}
