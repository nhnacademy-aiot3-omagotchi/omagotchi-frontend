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
                .setViewName("index");
        registry.addViewController("/index")
                .setViewName("index");
        registry.addViewController("/password-change")
                .setViewName("passwordChange");

        // 사용자 기능 Page
        registry.addViewController("/username")
                .setViewName("username"); // Learning 게임 프로필 연동 전 캐릭터 표시명 목업
        registry.addViewController("/character-selector")
                .setViewName("characterSelector");
        registry.addViewController("/check-in")
                .setViewName("check-in");
        registry.addViewController("/progress")
                .setViewName("progress");
        registry.addViewController("/personal")
                .setViewName("personal");
        registry.addViewController("/cohort")
                .setViewName("cohort");
        registry.addViewController("/write")
                .setViewName("write");
        registry.addViewController("/settings")
                .setViewName("settings");
        registry.addViewController("/help")
                .setViewName("help");
        registry.addViewController("/home")
                .setViewName("home");
        registry.addViewController("/space")
                .setViewName("space");

        // 관리자 Prototype Page
        registry.addViewController("/manager-dashboard")
                .setViewName("managerDashboard");
    }
}
