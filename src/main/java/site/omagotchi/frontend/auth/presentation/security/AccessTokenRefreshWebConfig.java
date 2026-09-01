package site.omagotchi.frontend.auth.presentation.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import site.omagotchi.frontend.global.web.BffApiPaths;

// 인증된 BFF 요청에 Access Token 선제 갱신 적용
@Configuration(proxyBeanMethods = false)
@RequiredArgsConstructor
public class AccessTokenRefreshWebConfig implements WebMvcConfigurer {

    private final AccessTokenRefreshInterceptor interceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor)
                // dev의 선제 갱신 범위는 기존 v1 BFF로 유지
                .addPathPatterns(BffApiPaths.V1_PATTERN)
                // 도메인 서비스 호출이 없는 CSRF Token 조회 제외
                .excludePathPatterns(BffApiPaths.PREFIX + "/csrf");
    }
}
