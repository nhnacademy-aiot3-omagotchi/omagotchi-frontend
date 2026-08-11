package site.omagotchi.frontend.auth.presentation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.stereotype.Component;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;

// 로그인 성공 Identity Token Bundle의 Browser Session 저장
@Component
@RequiredArgsConstructor
public class BrowserTokenSessionAuthenticationStrategy implements SessionAuthenticationStrategy {

    private final BrowserSessionTokens browserSessionTokens;

    @Override
    public void onAuthentication(
            Authentication authentication,
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response
    ) {
        if (!(authentication.getDetails() instanceof BrowserSessionTokenBundle tokenBundle)) {
            // Token Bundle 누락 인증 내부 오류
            throw new InternalAuthenticationServiceException(
                    "Identity Token Bundle이 없는 Authentication"
            );
        }
        if (!(authentication instanceof AbstractAuthenticationToken authenticationToken)) {
            // Token Bundle 제거 불가 인증 내부 오류
            throw new InternalAuthenticationServiceException(
                    "Identity Token Bundle 제거가 불가능한 Authentication"
            );
        }

        browserSessionTokens.save(request, tokenBundle);

        // SecurityContext의 Token Bundle 중복 저장 방지
        authenticationToken.setDetails(null);
    }
}
