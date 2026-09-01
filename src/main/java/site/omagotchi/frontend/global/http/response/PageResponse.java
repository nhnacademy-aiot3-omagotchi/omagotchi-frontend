package site.omagotchi.frontend.global.http.response;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        PageInfo page
) {

    public PageResponse {
        items = items == null ? null : List.copyOf(items);
    }
}
