package site.omagotchi.frontend.auth.presentation.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import site.omagotchi.frontend.global.web.BffApiPaths;

// 인증 BFF와 하류 권한을 조회하는 Page에 Access Token 선제 갱신 적용
@Configuration(proxyBeanMethods = false)
@RequiredArgsConstructor
public class AccessTokenRefreshWebConfig implements WebMvcConfigurer {

    private final AccessTokenRefreshInterceptor interceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor)
                .addPathPatterns(
                        BffApiPaths.V1_PATTERN,
                        "/home",
                        "/manager-dashboard",
                        "/authenticated-landing"
                )
                // 도메인 서비스 호출이 없는 CSRF Token 조회 제외
                .excludePathPatterns(BffApiPaths.PREFIX + "/csrf");
    }
}
