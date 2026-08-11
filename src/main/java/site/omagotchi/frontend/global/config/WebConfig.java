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

        // 사용자 기능 Page
        registry.addViewController("/username")
                .setViewName("pages/onboarding/username"); // Learning 게임 프로필 연동 전 캐릭터 표시명 목업
        registry.addViewController("/character-selector")
                .setViewName("pages/onboarding/characterSelector");
        registry.addViewController("/check-in")
                .setViewName("pages/onboarding/check-in");
        registry.addViewController("/progress")
                .setViewName("pages/app/progress");
        registry.addViewController("/personal")
                .setViewName("pages/app/personal");
        registry.addViewController("/cohort")
                .setViewName("pages/app/cohort");
        registry.addViewController("/write")
                .setViewName("pages/app/write");
        registry.addViewController("/settings")
                .setViewName("pages/app/settings");
        registry.addViewController("/help")
                .setViewName("pages/app/help");
        registry.addViewController("/home")
                .setViewName("pages/app/home");
        registry.addViewController("/space")
                .setViewName("pages/app/space");

        // 관리자 Prototype Page
        registry.addViewController("/manager-dashboard")
                .setViewName("manager/dashboard/index");
    }
}
