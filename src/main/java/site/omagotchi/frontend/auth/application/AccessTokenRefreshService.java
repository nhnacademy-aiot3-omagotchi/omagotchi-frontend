package site.omagotchi.frontend.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import site.omagotchi.frontend.auth.application.port.BrowserSessionRefreshLock;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.time.Instant;

// 브라우저 세션별 Access Token 선제 갱신 절차
@Service
@RequiredArgsConstructor
public class AccessTokenRefreshService {

    private final IdentityAuthClient identityAuthClient;
    private final BrowserSessionTokenStore tokenStore;
    private final BrowserSessionRefreshLock refreshLock;
    private final AccessTokenRefreshProperties properties;

    public BrowserSessionTokenBundle refreshIfRequired(
            String sessionId,
            BrowserSessionTokenBundle observedTokenBundle
    ) {
        // 갱신이 필요하지 않은 Access Token 유효 기간 확인
        if (hasEnoughAccessTokenLifetime(observedTokenBundle)) {
            return observedTokenBundle;
        }
        try {
            // 같은 브라우저 세션에서 하나씩 실행되는 토큰 갱신
            return refreshLock.execute(
                    sessionId,
                    () -> refreshLatest(sessionId, observedTokenBundle)
            );
        } catch (BrowserSessionStoreUnavailableException exception) {
            throw new BusinessException(
                    CommonErrorCode.SERVICE_UNAVAILABLE,
                    exception
            );
        }
    }

    private boolean hasEnoughAccessTokenLifetime(
            BrowserSessionTokenBundle tokenBundle
    ) {
        return tokenBundle.accessTokenExpiresAt().isAfter(
                Instant.now().plus(properties.refreshBeforeExpiry())
        );
    }

    private BrowserSessionTokenBundle refreshLatest(
            String sessionId,
            BrowserSessionTokenBundle observedTokenBundle
    ) {
        // 잠금 획득 뒤 저장소의 최신 세션 재조회
        BrowserSessionTokenBundle latest = findLatestTokenBundle(sessionId);
        if (!observedTokenBundle.userId().equals(latest.userId())
                || observedTokenBundle.globalRole() != latest.globalRole()
        ) {
            throw new BusinessException(
                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                    "Browser Session의 인증 주체가 요청 중 변경되었습니다."
            );
        }

        // 앞선 요청이 이미 갱신한 경우 Identity 호출 생략
        if (hasEnoughAccessTokenLifetime(latest)) {
            return latest;
        }
        if (!latest.refreshTokenExpiresAt().isAfter(Instant.now())) {
            throw new BusinessException(
                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                    "Refresh Token이 만료되었습니다."
            );
        }

        // 최신 Refresh Token을 사용한 Identity 토큰 갱신
        BrowserSessionTokenBundle refreshed = refreshIdentityToken(
                latest.refreshToken()
        );
        validateRefreshedTokenBundle(latest, refreshed);
        saveRefreshedTokenBundle(sessionId, refreshed);
        return refreshed;
    }

    private BrowserSessionTokenBundle findLatestTokenBundle(String sessionId) {
        return tokenStore.find(sessionId)
                .orElseThrow(() -> new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED,
                        "Browser Session Token Bundle을 찾을 수 없습니다."
                ));
    }

    private BrowserSessionTokenBundle refreshIdentityToken(String refreshToken) {
        try {
            return identityAuthClient.refresh(refreshToken);
        } catch (BusinessException exception) {
            boolean requiresLogin =
                    exception.getErrorCode() == AuthErrorCode.INVALID_REFRESH_TOKEN
                            || exception.getErrorCode()
                            == CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE;
            if (!requiresLogin) {
                throw exception;
            }
            throw new BusinessException(
                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                    "Identity Refresh를 완료할 수 없습니다.",
                    exception
            );
        }
    }

    private void validateRefreshedTokenBundle(
            BrowserSessionTokenBundle latest,
            BrowserSessionTokenBundle refreshed
    ) {
        // 인증 주체와 새 토큰 유효 기간을 포함한 성공 응답 검증
        Instant now = Instant.now();
        if (!latest.userId().equals(refreshed.userId())
                || latest.globalRole() != refreshed.globalRole()
                || latest.accessToken().equals(refreshed.accessToken())
                || latest.refreshToken().equals(refreshed.refreshToken())
                || !refreshed.accessTokenExpiresAt().isAfter(now.plus(properties.refreshBeforeExpiry()))
                || !refreshed.refreshTokenExpiresAt().isAfter(now)
        ) {
            throw new BusinessException(
                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                    "Identity Refresh 성공 응답을 신뢰할 수 없습니다."
            );
        }
    }

    private void saveRefreshedTokenBundle(
            String sessionId,
            BrowserSessionTokenBundle refreshed
    ) {
        try {
            // 현재 세션에 새 토큰 묶음을 저장한 뒤에만 갱신 완료 처리
            if (!tokenStore.save(sessionId, refreshed)) {
                throw new BusinessException(
                        SecurityErrorCode.AUTHENTICATION_REQUIRED,
                        "Refresh 중 Browser Session이 사라졌습니다."
                );
            }
        } catch (BrowserSessionStoreUnavailableException exception) {
            throw new BusinessException(
                    SecurityErrorCode.AUTHENTICATION_REQUIRED,
                    "새 Token Bundle 저장 결과가 불명확합니다.",
                    exception
            );
        }
    }
}
