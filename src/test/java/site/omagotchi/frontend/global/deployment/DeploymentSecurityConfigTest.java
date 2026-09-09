package site.omagotchi.frontend.global.deployment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

class DeploymentSecurityConfigTest {

    @ParameterizedTest
    @CsvSource({"127.0.0.1, 204", "::1, 204", "0:0:0:0:0:0:0:1, 204", "127.0.0.2, 403", "172.24.0.2, 403"})
    @DisplayName("전달 Header와 무관한 실제 Loopback 연결의 관리 요청만 허용")
    void restrictsManagementToLoopback(String remote, int expectedStatus) throws Exception {
        // Given: 업무 Context 없이 실제 Spring Security Filter Chain 구성
        try (AnnotationConfigWebApplicationContext context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(TestSecurityConfig.class);
            context.refresh();
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/actuator/serviceregistry");
            request.setServletPath("/actuator/serviceregistry");
            request.setRemoteAddr(remote);
            request.addHeader("X-Forwarded-For", "127.0.0.1");
            request.addHeader("Forwarded", "for=127.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();

            // When: CSRF·업무 인증 없이 컨테이너 내부에서 실행하는 상태 변경
            context.getBean(FilterChainProxy.class).doFilter(request, response,
                    (incoming, outgoing) -> response.setStatus(204));

            // Then
            assertThat(response.getStatus()).isEqualTo(expectedStatus);
        }
    }

    @Configuration
    @EnableWebSecurity
    @Import(DeploymentSecurityConfig.class)
    static class TestSecurityConfig {
    }
}
