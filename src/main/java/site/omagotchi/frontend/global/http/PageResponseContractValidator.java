package site.omagotchi.frontend.global.http;

import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;

public final class PageResponseContractValidator {

    private PageResponseContractValidator() {
    }

    public static <T> PageResponse<T> requireValid(
            PageResponse<T> response,
            String operation
    ) {
        if (!isValid(response)) {
            throw new BusinessException(
                    CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE,
                    operation + " 페이지 응답 계약 위반"
            );
        }
        return response;
    }

    private static boolean isValid(PageResponse<?> response) {
        if (response == null || response.items() == null || response.page() == null) {
            return false;
        }

        PageInfo page = response.page();
        if (page.number() < 0
                || page.size() < 1
                || page.totalElements() < 0
                || page.totalPages() < 0
                || response.items().size() > page.size()
                || response.items().size() > page.totalElements()) {
            return false;
        }

        long expectedTotalPages = Math.ceilDiv(page.totalElements(), (long) page.size());
        return page.totalPages() == Math.min(expectedTotalPages, Integer.MAX_VALUE);
    }
}
