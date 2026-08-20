package site.omagotchi.frontend.global.session;

import jakarta.servlet.DispatcherType;
import org.springframework.boot.session.autoconfigure.SessionProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.EnumSet;

// Spring Session Redis 장애 Filter의 Servlet 등록과 실행 순서 설정
@Configuration(proxyBeanMethods = false)
public class SessionStoreConfig {

    @Bean
    FilterRegistrationBean<SessionStoreErrorFilter> sessionStoreErrorFilter(
            SessionStoreFailureResponseWriter failureResponseWriter,
            SessionProperties sessionProperties
    ) {
        // 자동 구성 SessionRepositoryFilter 바깥 배치를 위한 명시적 Servlet Filter 등록
        FilterRegistrationBean<SessionStoreErrorFilter> registration =
                new FilterRegistrationBean<>(
                        new SessionStoreErrorFilter(failureResponseWriter)
                );
        registration.setName("sessionStoreErrorFilter");
        // 별도·중첩 ERROR dispatch의 Redis Session 장애 감시 범위 고정
        registration.setDispatcherTypes(EnumSet.allOf(DispatcherType.class));
        // Spring Session의 조회 전·저장 후 예외를 모두 감싸는 직전 순서
        registration.setOrder(sessionStoreErrorFilterOrder(sessionProperties));
        return registration;
    }

    // 사용자 지정 spring.session.servlet.filter-order를 반영한 직전 순서 계산
    private int sessionStoreErrorFilterOrder(SessionProperties sessionProperties) {
        int sessionFilterOrder = sessionProperties.getServlet().getFilterOrder();
        // 직전 순서 계산의 정수 오버플로우 방지
        if (sessionFilterOrder == Integer.MIN_VALUE) {
            throw new IllegalStateException(
                    "spring.session.servlet.filter-order는 Integer.MIN_VALUE보다 커야 합니다."
            );
        }
        return sessionFilterOrder - 1;
    }
}
