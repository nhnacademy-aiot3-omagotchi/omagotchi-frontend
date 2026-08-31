package site.omagotchi.frontend.account.application.result;

import java.util.List;

public record AdminAccountPage(
        List<AdminAccountView> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public AdminAccountPage {
        content = content == null ? List.of() : List.copyOf(content);
    }
}
