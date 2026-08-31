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
                .setViewName("pages/onboarding/username");
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
        registry.addViewController("/settings/account")
                .setViewName("pages/auth/accountSettings");
        registry.addViewController("/help")
                .setViewName("pages/app/help");
        registry.addViewController("/space")
                .setViewName("pages/app/space");
    }
}
