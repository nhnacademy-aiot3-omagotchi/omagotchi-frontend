package site.omagotchi.frontend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 시작·회원 인증 Page
        registry.addViewController("/")
                .setViewName("index");
        registry.addViewController("/index")
                .setViewName("index");
        registry.addViewController("/login")
                .setViewName("login");
        registry.addViewController("/password-change")
                .setViewName("passwordChange");
        registry.addViewController("/register")
                .setViewName("register");
        registry.addViewController("/username")
                .setViewName("username");

        // 사용자 기능 Page
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

        // 관리자 Page
        registry.addViewController("/manager-login")
                .setViewName("managerLogin");
        registry.addViewController("/manager-register")
                .setViewName("managerRegister");
        registry.addViewController("/manager-dashboard")
                .setViewName("managerDashboard");
    }
}
