package site.omagotchi.frontend.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.account.application.port.IdentityAdminAuditClient;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;

/**
 * 권한 변경 감사 조회 BFF Use Case.
 *
 * <p>Identity 단독 조회라 합성이 없다. 계정 목록과 달리 Learning 을 부르지 않으므로
 * {@link AdminAccountBffService}에 얹지 않고 분리해 둔다.</p>
 */
@Service
@RequiredArgsConstructor
public class AdminAuditBffService {

    private final IdentityAdminAuditClient identityAuditClient;

    public IdentityAdminAuditPage findAudits(String accessToken, Integer page, Integer size) {
        return identityAuditClient.findAudits(accessToken, page, size);
    }
}
