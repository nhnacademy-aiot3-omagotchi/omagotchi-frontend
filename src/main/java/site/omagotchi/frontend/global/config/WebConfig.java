package site.omagotchi.frontend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 시작·인증 보조 Page
        registry.addViewController("/")
                .setViewName("pages/public/index");
        registry.addViewController("/index")
                .setViewName("pages/public/index");
        registry.addViewController("/password-change")
                .setViewName("pages/auth/passwordChange");
        registry.addViewController("/username")
                .setViewName("pages/auth/username"); // Learning 게임 프로필 연동 전 캐릭터 표시명 목업
    }
}
