package site.omagotchi.frontend.auth.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import site.omagotchi.frontend.auth.application.port.BrowserSessionRefreshLock;
import site.omagotchi.frontend.auth.application.port.BrowserSessionStoreUnavailableException;
import site.omagotchi.frontend.auth.application.port.BrowserSessionTokenStore;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.security.SecurityErrorCode;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AccessTokenRefreshServiceTest {

    private static final String SESSION_ID = "browser-session-id";
    private static final Instant NOW = Instant.now();

    @Mock
    private IdentityAuthClient identityAuthClient;

    @Mock
    private BrowserSessionTokenStore tokenStore;

    @Mock
    private BrowserSessionRefreshLock refreshLock;

    private AccessTokenRefreshService service;

    @BeforeEach
    void setUp() {
        service = new AccessTokenRefreshService(
                identityAuthClient,
                tokenStore,
                refreshLock,
                new AccessTokenRefreshProperties(Duration.ofSeconds(30))
        );
        lenient().when(refreshLock.execute(
                eq(SESSION_ID),
                org.mockito.ArgumentMatchers.<Supplier<BrowserSessionTokenBundle>>any()
        )).thenAnswer(invocation -> {
            Supplier<BrowserSessionTokenBundle> operation = invocation.getArgument(1);
            return operation.get();
        });
    }

    @Test
    @DisplayName("유효 시간이 충분한 Access Token의 Refresh 생략")
    void skipsRefreshForUsableAccessToken() {
        // Given: 선제 갱신 구간 밖의 Access Token
        BrowserSessionTokenBundle usable = usableTokenBundle();

        // When: BFF 요청 진입 단계의 Token 확인
        BrowserSessionTokenBundle result = service.refreshIfRequired(SESSION_ID, usable);

        // Then: Redis Lock과 Identity 호출 없는 기존 Bundle 사용
        assertThat(result).isSameAs(usable);
        verify(refreshLock, never()).execute(anyString(), any());
        verify(identityAuthClient, never()).refresh(anyString());
    }

    @Test
    @DisplayName("Session별 실행 경계에서 최신 Bundle 갱신과 저장")
    void refreshesLatestBundleAndSavesIt() {
        // Given: 만료 임박 Session과 Identity가 회전한 새 Bundle
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willReturn(refreshed);
        given(tokenStore.save(SESSION_ID, refreshed)).willReturn(true);

        // When: Access Token 선제 Refresh
        BrowserSessionTokenBundle result = service.refreshIfRequired(SESSION_ID, expiring);

        // Then: 최신 Refresh Token을 한 번 사용하고 새 Bundle 저장
        assertThat(result).isEqualTo(refreshed);
        InOrder order = inOrder(identityAuthClient, tokenStore);
        order.verify(identityAuthClient).refresh(expiring.refreshToken());
        order.verify(tokenStore).save(SESSION_ID, refreshed);
    }

    @Test
    @DisplayName("먼저 갱신된 최신 Session Bundle 재사용")
    void reusesLatestBundle() {
        // Given: 현재 요청의 관찰값보다 먼저 갱신된 Redis Session
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        givenLatest(refreshed);

        // When: Session별 실행 경계에서 최신 Bundle 재조회
        BrowserSessionTokenBundle result = service.refreshIfRequired(SESSION_ID, expiring);

        // Then: Identity 중복 호출과 Session 재저장 없이 최신 Bundle 사용
        assertThat(result).isEqualTo(refreshed);
        verify(identityAuthClient, never()).refresh(anyString());
        verify(tokenStore, never()).save(anyString(), any());
    }

    @Test
    @DisplayName("오래된 요청의 만료된 Refresh Token 대신 최신 Session Bundle 재사용")
    void reusesLatestBundleWhenObservedRefreshTokenIsExpired() {
        // Given: 현재 요청의 관찰값은 만료됐지만 Redis Session은 이미 갱신된 상태
        BrowserSessionTokenBundle stale = new BrowserSessionTokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                GlobalRole.USER,
                "stale-access-token",
                NOW.plusSeconds(5),
                "stale-refresh-token",
                NOW.minusSeconds(1)
        );
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        givenLatest(refreshed);

        // When: Session별 실행 경계에서 최신 Bundle 재조회
        BrowserSessionTokenBundle result = service.refreshIfRequired(SESSION_ID, stale);

        // Then: 오래된 만료값으로 Session을 거절하지 않고 최신 Bundle 사용
        assertThat(result).isEqualTo(refreshed);
        verify(identityAuthClient, never()).refresh(anyString());
        verify(tokenStore, never()).save(anyString(), any());
    }

    @Test
    @DisplayName("요청 중 인증 주체가 달라진 Session 거절")
    void rejectsLatestBundleForDifferentPrincipal() {
        // Given: 같은 Session ID에 다른 사용자 Bundle이 저장된 상태
        BrowserSessionTokenBundle observed = expiringTokenBundle();
        BrowserSessionTokenBundle differentPrincipal = tokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "other-access-token",
                NOW.plus(Duration.ofMinutes(15)),
                "other-refresh-token"
        );
        givenLatest(differentPrincipal);

        // When: 최신 Session Bundle 재조회
        // Then: 다른 인증 주체로 Controller를 진행하지 않고 재로그인 요구
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, observed),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
        verify(identityAuthClient, never()).refresh(anyString());
    }

    @Test
    @DisplayName("명시적인 Identity 503의 Session 유지와 자동 재시도 금지")
    void keepsSessionForExplicitServiceUnavailable() {
        // Given: Identity가 반환한 명시적인 503
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BusinessException unavailable = new BusinessException(
                CommonErrorCode.SERVICE_UNAVAILABLE,
                new IllegalStateException("Identity HTTP 503")
        );
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willThrow(unavailable);

        // When: 선제 Refresh
        // Then: Session 미변경과 단일 Identity 호출 뒤 503
        assertThatThrownBy(() -> service.refreshIfRequired(SESSION_ID, expiring))
                .isSameAs(unavailable);
        verify(identityAuthClient, times(1)).refresh(expiring.refreshToken());
        verify(tokenStore, never()).save(anyString(), any());
    }

    @Test
    @DisplayName("응답 미수신 뒤 다음 Browser 요청의 Refresh 허용")
    void allowsLaterRequestToRetryAfterMissingResponse() {
        // Given: 첫 요청의 Identity 응답 미수신과 유지된 Session
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken()))
                .willThrow(new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE))
                .willReturn(refreshed);
        given(tokenStore.save(SESSION_ID, refreshed)).willReturn(true);

        // When: 첫 요청 실패 뒤 다음 Browser 요청이 진입
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        BrowserSessionTokenBundle result = service.refreshIfRequired(SESSION_ID, expiring);

        // Then: 요청 안의 자동 재시도 없이 다음 요청에서만 다시 호출
        assertThat(result).isEqualTo(refreshed);
        verify(identityAuthClient, times(2)).refresh(expiring.refreshToken());
    }

    @Test
    @DisplayName("명시적인 Refresh 401의 재로그인 요구")
    void requiresLoginForRejectedRefreshToken() {
        // Given: Identity가 명시적으로 거절한 Refresh Token
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken()))
                .willThrow(new BusinessException(AuthErrorCode.INVALID_REFRESH_TOKEN));

        // When: 선제 Refresh
        // Then: 새 Bundle 저장 없이 인증 Session 폐기 대상 401
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
        verify(tokenStore, never()).save(anyString(), any());
    }

    @Test
    @DisplayName("Identity Refresh 응답 계약 위반의 재로그인 요구")
    void requiresLoginForInvalidRefreshResponse() {
        // Given: 결과를 신뢰할 수 없는 Identity Refresh 응답
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willThrow(
                new BusinessException(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE)
        );

        // When: Identity Refresh 응답 계약 위반
        // Then: 이전 Refresh Token을 사용하지 않는 재로그인 요구
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
    }

    @Test
    @DisplayName("새 Bundle 저장 결과 불명확 시 이전 Bundle 사용 금지")
    void requiresLoginWhenNewBundleSaveIsUncertain() {
        // Given: Identity 회전 성공 뒤 Redis 저장 연결 실패
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle refreshed = refreshedTokenBundle();
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willReturn(refreshed);
        given(tokenStore.save(SESSION_ID, refreshed))
                .willThrow(storeUnavailable("save uncertain"));

        // When: 새 Bundle 명시 저장
        // Then: 이전 Bundle 반환 없이 재로그인 요구
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
    }

    @Test
    @DisplayName("회전되지 않은 Refresh 성공 Bundle 저장 거절")
    void rejectsSuccessfulResponseWithoutTokenRotation() {
        // Given: Identity 성공 응답이 이전 Token을 그대로 반환
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        BrowserSessionTokenBundle notRotated = tokenBundle(
                expiring.userId(),
                expiring.accessToken(),
                NOW.plus(Duration.ofMinutes(15)),
                expiring.refreshToken()
        );
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willReturn(notRotated);

        // When: Refresh 성공 Bundle 검증
        // Then: 이전 Token 저장 없이 재로그인 요구
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                SecurityErrorCode.AUTHENTICATION_REQUIRED
        );
        verify(tokenStore, never()).save(anyString(), any());
    }

    @Test
    @DisplayName("Refresh 전 Redis Lock 장애의 Session 유지와 503")
    void keepsSessionWhenLockStoreIsUnavailable() {
        // Given: Identity 호출 전 Redis Lock 연결 실패
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        given(refreshLock.execute(
                eq(SESSION_ID),
                org.mockito.ArgumentMatchers.<Supplier<BrowserSessionTokenBundle>>any()
        )).willThrow(storeUnavailable("lock unavailable"));

        // When: Session별 Refresh 실행 경계 진입
        // Then: Identity 미호출과 Session 유지 대상 503
        assertRefreshError(
                () -> service.refreshIfRequired(SESSION_ID, expiring),
                CommonErrorCode.SERVICE_UNAVAILABLE
        );
        verify(identityAuthClient, never()).refresh(anyString());
    }

    @Test
    @DisplayName("예상 밖 Refresh 호출 예외의 원본 전파")
    void propagatesUnexpectedRefreshFailure() {
        // Given: Identity Adapter의 예상하지 못한 구현 실패
        BrowserSessionTokenBundle expiring = expiringTokenBundle();
        IllegalStateException unexpected = new IllegalStateException("unexpected");
        givenLatest(expiring);
        given(identityAuthClient.refresh(expiring.refreshToken())).willThrow(unexpected);

        // When: 선제 Refresh 호출
        // Then: 401이나 503으로 숨기지 않고 원본 전파
        assertThatThrownBy(() -> service.refreshIfRequired(SESSION_ID, expiring))
                .isSameAs(unexpected);
    }

    private void givenLatest(BrowserSessionTokenBundle latest) {
        given(tokenStore.find(SESSION_ID)).willReturn(Optional.of(latest));
    }

    private static BrowserSessionStoreUnavailableException storeUnavailable(String message) {
        return new BrowserSessionStoreUnavailableException(
                new IllegalStateException(message)
        );
    }

    private static void assertRefreshError(
            org.assertj.core.api.ThrowableAssert.ThrowingCallable operation,
            site.omagotchi.frontend.global.exception.ErrorCode expected
    ) {
        assertThatThrownBy(operation)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(expected)
                );
    }

    private static BrowserSessionTokenBundle usableTokenBundle() {
        return tokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "usable-access-token",
                NOW.plus(Duration.ofMinutes(15)),
                "usable-refresh-token"
        );
    }

    private static BrowserSessionTokenBundle expiringTokenBundle() {
        return tokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "previous-access-token",
                NOW.plusSeconds(5),
                "previous-refresh-token"
        );
    }

    private static BrowserSessionTokenBundle refreshedTokenBundle() {
        return tokenBundle(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "new-access-token",
                NOW.plus(Duration.ofMinutes(15)),
                "new-refresh-token"
        );
    }

    private static BrowserSessionTokenBundle tokenBundle(
            UUID userId,
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken
    ) {
        return new BrowserSessionTokenBundle(
                userId,
                GlobalRole.USER,
                accessToken,
                accessTokenExpiresAt,
                refreshToken,
                NOW.plus(Duration.ofHours(1))
        );
    }
}
