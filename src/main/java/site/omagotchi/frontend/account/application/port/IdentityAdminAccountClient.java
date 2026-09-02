package site.omagotchi.frontend.account.application.port;

import site.omagotchi.frontend.account.application.result.IdentityAdminAccountPage;

import java.util.UUID;

public interface IdentityAdminAccountClient {

    IdentityAdminAccountPage findAccounts(
            String accessToken,
            String query,
            String status,
            String role,
            Integer page,
            Integer size,
            String sort
    );

    /**
     * 계정 상태를 변경한다.
     *
     * <p>Identity는 같은 상태로의 요청을 조용히 무시하고(멱등), DISABLED 전이에서만
     * Refresh Session을 폐기한다. 사유는 필수다.</p>
     */
    void changeStatus(
            String accessToken,
            UUID userId,
            String status,
            String reason
    );

    /**
     * 전역 역할을 변경한다.
     *
     * <p>Identity는 같은 역할로의 요청을 조용히 무시한다(멱등). 자기 자신 변경과 마지막
     * 이용 가능 관리자 강등은 Identity가 거부한다. 사유는 필수다.</p>
     */
    void changeRole(
            String accessToken,
            UUID userId,
            String role,
            String reason
    );
}
