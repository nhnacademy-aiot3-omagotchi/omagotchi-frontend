package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.port.IdentityAuthClient;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.application.result.SignupResult;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class IdentityLoginAuthenticationProviderTest {

    @Test
    @DisplayName("Identity 성공의 UUID Principal·Role Authority·빈 Credential 반환")
    void returnsAuthenticatedTokenWithoutCredential() {
        // Given: Identity Login 성공과 Token Bundle
        BrowserSessionTokenBundle tokenBundle = new BrowserSessionTokenBundle(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2099-01-01T00:00:00Z"),
                "refresh-token",
                Instant.parse("2099-01-02T00:00:00Z")
        );
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        identityAuthClient.tokenBundle = tokenBundle;
        IdentityLoginAuthenticationProvider provider =
                new IdentityLoginAuthenticationProvider(
                        new AuthenticationService(identityAuthClient)
                );

        // When: Spring Security 자격 증명 검증
        Authentication authentication = provider.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        " user@example.com ",
                        "password-passphrase"
                )
        );

        // Then: UUID Principal·Role Authority·Session 전략용 Token Bundle
        assertSoftly(softly -> {
            softly.assertThat(authentication.getPrincipal())
                    .isEqualTo(tokenBundle.userId().toString());
            softly.assertThat(authentication.getAuthorities())
                    .extracting(GrantedAuthority::getAuthority)
                    .containsExactly("ROLE_USER");
            softly.assertThat(authentication.getCredentials()).isNull();
            softly.assertThat(authentication.getDetails()).isSameAs(tokenBundle);
            softly.assertThat(identityAuthClient.loginEmail)
                    .isEqualTo("user@example.com");
            softly.assertThat(identityAuthClient.loginPassword)
                    .isEqualTo("password-passphrase");
        });
    }

    @Test
    @DisplayName("Identity 장애의 외부 인증 서비스 오류 변환")
    void translatesIdentityFailureToAuthenticationServiceException() {
        // Given: Identity 접속 실패
        BusinessException identityFailure =
                new BusinessException(CommonErrorCode.SERVICE_UNAVAILABLE);
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        identityAuthClient.loginFailure = identityFailure;
        IdentityLoginAuthenticationProvider provider =
                new IdentityLoginAuthenticationProvider(
                        new AuthenticationService(identityAuthClient)
                );

        // When: Spring Security 자격 증명 검증
        // Then: AuthenticationServiceException 변환과 원인 보존
        assertThatThrownBy(() -> provider.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        "user@example.com",
                        "password-passphrase"
                )
        ))
                .isInstanceOf(AuthenticationServiceException.class)
                .isNotInstanceOf(InternalAuthenticationServiceException.class)
                .satisfies(exception -> assertThat(exception.getCause()).isSameAs(identityFailure));
    }

    @Test
    @DisplayName("Identity 자격 증명 거절의 BadCredentialsException 변환")
    void translatesInvalidCredentialsToBadCredentialsException() {
        // Given: Identity 자격 증명 거절
        BusinessException invalidCredentials =
                new BusinessException(AuthErrorCode.INVALID_CREDENTIALS);
        RecordingIdentityAuthClient identityAuthClient = new RecordingIdentityAuthClient();
        identityAuthClient.loginFailure = invalidCredentials;
        IdentityLoginAuthenticationProvider provider =
                new IdentityLoginAuthenticationProvider(
                        new AuthenticationService(identityAuthClient)
                );

        // When: Spring Security 자격 증명 검증
        // Then: BadCredentialsException 변환과 원인 보존
        assertThatThrownBy(() -> provider.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        "user@example.com",
                        "password-passphrase"
                )
        ))
                .isInstanceOf(BadCredentialsException.class)
                .satisfies(exception -> assertThat(exception.getCause())
                        .isSameAs(invalidCredentials));
    }

    // Provider 입력·출력 관찰만을 위한 파일 내부 Identity fake
    private static final class RecordingIdentityAuthClient implements IdentityAuthClient {

        private BrowserSessionTokenBundle tokenBundle;
        private RuntimeException loginFailure;
        private String loginEmail;
        private String loginPassword;

        @Override
        public SignupResult signUp(String email, String password, String name) {
            throw new UnsupportedOperationException();
        }

        @Override
        public BrowserSessionTokenBundle login(String email, String password) {
            loginEmail = email;
            loginPassword = password;
            if (loginFailure != null) {
                throw loginFailure;
            }
            return tokenBundle;
        }

        @Override
        public void logout(String refreshToken) {
            throw new UnsupportedOperationException();
        }
    }

}
