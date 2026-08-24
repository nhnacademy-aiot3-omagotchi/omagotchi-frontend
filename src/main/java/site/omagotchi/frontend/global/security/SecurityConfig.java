package site.omagotchi.frontend.global.security;

import jakarta.servlet.DispatcherType;
import org.springframework.boot.security.autoconfigure.web.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.RequestCacheConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.AnyRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import site.omagotchi.frontend.auth.application.AuthenticationService;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLoginRequestFilter;
import site.omagotchi.frontend.auth.presentation.security.AuthenticatedLandingPage;
import site.omagotchi.frontend.auth.presentation.security.BrowserTokenSessionAuthenticationStrategy;
import site.omagotchi.frontend.auth.presentation.security.IdentityLoginAuthenticationProvider;
import site.omagotchi.frontend.auth.presentation.security.IdentityLogoutHandler;
import site.omagotchi.frontend.auth.presentation.security.LoginAuthenticationFailureHandler;
import site.omagotchi.frontend.global.web.BffApiPaths;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationManager authenticationManager,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            LoginAuthenticationFailureHandler loginFailureHandler,
            IdentityLogoutHandler identityLogoutHandler,
            BffApiSecurityErrorHandler bffApiSecurityErrorHandler
    ) {
        RequestMatcher bffApiRequestMatcher =
                PathPatternRequestMatcher.pathPattern(BffApiPaths.PATTERN);

        http
                .authenticationManager(authenticationManager) // Identity Login Provider의 명시적 단일 등록
                // Form Login 성공 뒤의 공통 HTTP Session 인증 전략
                .sessionManagement(session -> session
                        .sessionAuthenticationStrategy(sessionAuthenticationStrategy)
                )
                .authorizeHttpRequests(authorize -> authorize
                        .dispatcherTypeMatchers(
                                DispatcherType.ERROR
                        ).permitAll() // 내부 오류 dispatch의 재인증 방지
                        .requestMatchers(
                                PathRequest.toStaticResources().atCommonLocations()
                        ).permitAll() // 인증 전 CSS·JS·image 제공
                        .requestMatchers(
                                "/preview/error/**"
                        ).permitAll() // Local Profile 오류 화면 단독 확인
                        .requestMatchers(
                                "/",
                                "/index",
                                "/login",
                                "/register",
                                "/password-change"
                        ).permitAll() // 로그인·일반 가입 진입용 공개 Page
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info"
                        ).permitAll() // 배포 확인용 최소 Actuator endpoint
                        .requestMatchers("/system-admin-dashboard").hasRole("SYSTEM_ADMIN")
                        .requestMatchers("/manager-dashboard").authenticated() // TODO 기수 관리자 권한 정책 적용
                        .requestMatchers(bffApiRequestMatcher).authenticated() // Browser Session 기반 BFF API
                        .anyRequest().authenticated() // 기본 보호 정책
                )
                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .successHandler((request, response, authentication) ->
                                response.sendRedirect(AuthenticatedLandingPage.resolve(authentication)))
                        .failureHandler(loginFailureHandler)
                        .permitAll()
                ) // Spring Security Filter 기반 HTML Form Login
                .addFilterBefore(
                        new AuthenticatedLoginRequestFilter(),
                        UsernamePasswordAuthenticationFilter.class
                ) // 인증된 Session의 중복 Login과 Token Family 추가 발급 방지
                .httpBasic(AbstractHttpConfigurer::disable) // Browser HTTP Basic 미사용
                .logout(logout -> logout
                        // Identity Token 폐기 시도 뒤 Spring Security 기본 Session·CSRF 정리
                        .addLogoutHandler(identityLogoutHandler)
                        .logoutSuccessUrl("/login")
                        .permitAll()
                )
                .requestCache(RequestCacheConfigurer::disable) // Login 성공의 Home 고정 이동
                .exceptionHandling(exceptions -> exceptions
                        // BFF API의 401·403 JSON 응답
                        .defaultAuthenticationEntryPointFor(
                                bffApiSecurityErrorHandler,
                                bffApiRequestMatcher
                        )
                        .defaultAccessDeniedHandlerFor(
                                bffApiSecurityErrorHandler,
                                bffApiRequestMatcher
                        )
                        // HTML Page의 Login redirect·기본 403 처리
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                AnyRequestMatcher.INSTANCE
                        )
                        .defaultAccessDeniedHandlerFor(
                                new AccessDeniedHandlerImpl(),
                                AnyRequestMatcher.INSTANCE
                        )
                );

        return http.build();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationService authenticationService) {
        return new ProviderManager(
                new IdentityLoginAuthenticationProvider(authenticationService)
        );
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(
            BrowserTokenSessionAuthenticationStrategy tokenSessionStrategy
    ) {
        // Session ID 교체와 Identity Token Bundle 저장
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                tokenSessionStrategy
        ));
    }

}
