package site.omagotchi.frontend.account.application.port;

import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;

public interface IdentityAdminAuditClient {

    /** 최근 발생 순 권한 변경 감사를 페이지 조회한다. */
    IdentityAdminAuditPage findAudits(String accessToken, Integer page, Integer size);
}
