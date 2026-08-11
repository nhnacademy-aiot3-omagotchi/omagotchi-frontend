package site.omagotchi.frontend.global.session;

import jakarta.servlet.DispatcherType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.session.autoconfigure.SessionProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.web.servlet.ViewResolver;
import site.omagotchi.frontend.global.web.ServletApiErrorResponseWriter;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionStoreConfigTest {

    private final SessionStoreConfig config = new SessionStoreConfig();
    private final ServletApiErrorResponseWriter servletApiErrorResponseWriter =
            new ServletApiErrorResponseWriter(JsonMapper.builder().build());
    // Filter 순서 Test에서 사용되지 않는 응답 작성 의존성의 최소 대역
    private final ViewResolver viewResolver = (viewName, locale) -> null;
    private final SessionStoreFailureResponseWriter failureResponseWriter =
            new SessionStoreFailureResponseWriter(
                    viewResolver,
                    servletApiErrorResponseWriter
            );

    @Test
    @DisplayName("기본 Spring Session Filter 바로 앞의 Servlet Filter 등록")
    void registersImmediatelyBeforeDefaultSpringSessionFilter() {
        // Given: 기본 Spring Session Servlet Filter 순서
        SessionProperties sessionProperties = new SessionProperties();

        // When: Session Store 오류 Filter 등록
        FilterRegistrationBean<SessionStoreErrorFilter> registration =
                config.sessionStoreErrorFilter(
                        failureResponseWriter,
                        sessionProperties
                );

        // Then: Spring Session 직전 순서와 모든 Servlet dispatch 등록
        assertThat(registration.getOrder())
                .isEqualTo(SessionRepositoryFilter.DEFAULT_ORDER - 1);
        assertThat(registration.determineDispatcherTypes())
                .containsExactlyInAnyOrder(DispatcherType.values());
    }

    @Test
    @DisplayName("변경된 Spring Session Filter 순서의 바로 앞 Servlet Filter 등록")
    void registersImmediatelyBeforeConfiguredSpringSessionFilter() {
        // Given: 운영 설정의 Spring Session Servlet Filter 순서 변경
        SessionProperties sessionProperties = new SessionProperties();
        sessionProperties.getServlet().setFilterOrder(-1_000);

        // When: Session Store 오류 Filter 등록
        FilterRegistrationBean<SessionStoreErrorFilter> registration =
                config.sessionStoreErrorFilter(
                        failureResponseWriter,
                        sessionProperties
                );

        // Then: 설정 변경에도 Spring Session 직전 순서 유지
        assertThat(registration.getOrder()).isEqualTo(-1_001);
    }

    @Test
    @DisplayName("최솟값 Spring Session Filter 순서의 기동 실패")
    void rejectsMinimumSpringSessionFilterOrder() {
        // Given: 한 단계 앞 순서가 존재하지 않는 설정
        SessionProperties sessionProperties = new SessionProperties();
        sessionProperties.getServlet().setFilterOrder(Integer.MIN_VALUE);

        // When: Session Store 오류 Filter 등록
        // Then: 순서 산술 오버플로우 방지
        assertThatThrownBy(() -> config.sessionStoreErrorFilter(
                failureResponseWriter,
                sessionProperties
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.session.servlet.filter-order");
    }
}
