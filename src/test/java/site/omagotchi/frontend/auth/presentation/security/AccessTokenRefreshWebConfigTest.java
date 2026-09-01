package site.omagotchi.frontend.auth.presentation.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.web.util.ServletRequestPathUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AccessTokenRefreshWebConfigTest {

    @Test
    @DisplayName("Access Token Refresh는 dev의 v1 BFF 범위에만 적용")
    void limitsRefreshInterceptorToV1Bff() {
        TestInterceptorRegistry registry = new TestInterceptorRegistry();
        new AccessTokenRefreshWebConfig(mock(AccessTokenRefreshInterceptor.class))
                .addInterceptors(registry);

        MappedInterceptor interceptor = (MappedInterceptor) registry.onlyInterceptor();

        assertThat(matches(interceptor, "/bff/v1/spaces")).isTrue();
        assertThat(matches(interceptor, "/bff/v1/csrf")).isFalse();
        assertThat(matches(interceptor, "/bff/v2/auth/signup")).isFalse();
        assertThat(matches(interceptor, "/bff/v2/private")).isFalse();
    }

    private static boolean matches(MappedInterceptor interceptor, String requestUri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", requestUri);
        ServletRequestPathUtils.parseAndCache(request);
        return interceptor.matches(request);
    }

    private static final class TestInterceptorRegistry extends InterceptorRegistry {

        private Object onlyInterceptor() {
            List<Object> interceptors = getInterceptors();
            assertThat(interceptors).hasSize(1);
            assertThat(interceptors.getFirst()).isInstanceOf(MappedInterceptor.class);
            return interceptors.getFirst();
        }
    }
}
