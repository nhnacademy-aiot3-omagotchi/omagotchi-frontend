package site.omagotchi.frontend.auth.presentation.security;

import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.StringUtils;
import site.omagotchi.frontend.auth.application.AuthErrorCode;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.global.exception.BusinessException;

import java.util.List;

// Identity Login API와 Spring Security 자격 증명 검증 연결
@RequiredArgsConstructor
public class IdentityLoginAuthenticationProvider implements AuthenticationProvider {

    private final AuthenticationService authenticationService;

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String email = authentication.getName();
        Object credentials = authentication.getCredentials();
        if (!StringUtils.hasText(email)
                || !(credentials instanceof String password)
                || !StringUtils.hasText(password)
        ) {
            throw new BadCredentialsException(AuthErrorCode.INVALID_CREDENTIALS.message());
        }

        BrowserSessionTokenBundle tokenBundle;
        try {
            tokenBundle = authenticationService.login(email.trim(), password);
        } catch (BusinessException exception) {
            if (exception.getErrorCode() == AuthErrorCode.INVALID_CREDENTIALS) {
                throw new BadCredentialsException(
                        AuthErrorCode.INVALID_CREDENTIALS.message(),
                        exception
                );
            }
            throw new AuthenticationServiceException(
                    "Identity Login 처리 실패",
                    exception
            );
        }

        UsernamePasswordAuthenticationToken authenticated =
                UsernamePasswordAuthenticationToken.authenticated(
                        tokenBundle.userId().toString(),
                        null,
                        List.of(new SimpleGrantedAuthority(
                                "ROLE_" + tokenBundle.globalRole().name()
                        ))
                );
        // Session 인증 전략 전달용 Token Bundle
        authenticated.setDetails(tokenBundle);
        return authenticated;
    }

    @Override
    public boolean supports(@NonNull Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
