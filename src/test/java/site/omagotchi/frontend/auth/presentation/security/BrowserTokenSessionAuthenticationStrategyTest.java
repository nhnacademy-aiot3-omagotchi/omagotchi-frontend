package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class BrowserTokenSessionAuthenticationStrategyTest {

    private final BrowserTokenSessionAuthenticationStrategy strategy =
            new BrowserTokenSessionAuthenticationStrategy(new BrowserSessionTokens());

    @Test
    @DisplayName("Identity Token Bundle의 Session 저장과 SecurityContext 분리")
    void savesTokenBundleAndClearsAuthenticationDetails() {
        // Given: Identity Token Bundle을 포함한 인증 성공 결과
        BrowserSessionTokenBundle tokenBundle = new BrowserSessionTokenBundle(
                UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                GlobalRole.USER,
                "access-token",
                Instant.parse("2099-01-01T00:00:00Z"),
                "refresh-token",
                Instant.parse("2099-01-02T00:00:00Z")
        );
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        tokenBundle.userId().toString(),
                        null,
                        List.of()
                );
        authentication.setDetails(tokenBundle);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");

        // When: Login 성공 Session 전략 실행
        strategy.onAuthentication(
                authentication,
                request,
                new MockHttpServletResponse()
        );

        // Then: Token Bundle의 별도 Session attribute 저장과 인증 details 제거
        assertSoftly(softly -> {
            softly.assertThat(new BrowserSessionTokens().find(request))
                    .contains(tokenBundle);
            softly.assertThat(authentication.getDetails())
                    .isNull();
        });
    }

    @Test
    @DisplayName("Identity Token Bundle 없는 인증 성공의 Session 수립 거절")
    void rejectsAuthenticationWithoutTokenBundle() {
        // Given: Identity Token Bundle이 없는 인증 성공 결과
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        "user-id",
                        null,
                        List.of()
                );

        // When: Login 성공 Session 전략 실행
        // Then: Token 없는 인증 Session 수립 거절
        assertThatThrownBy(() -> strategy.onAuthentication(
                authentication,
                new MockHttpServletRequest("POST", "/login"),
                new MockHttpServletResponse()
        )).isInstanceOf(InternalAuthenticationServiceException.class);
    }
}
