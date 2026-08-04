package site.omagotchi.frontend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Server Model 없는 정적 Thymeleaf Page
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
    }
}
