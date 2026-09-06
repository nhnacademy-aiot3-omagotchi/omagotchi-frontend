package site.omagotchi.frontend.global.requestid;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;

/** Frontend의 동기 HTTP Service Client에 Request ID 전파 적용. */
@Configuration(proxyBeanMethods = false)
public class RequestIdHttpClientConfig {

    @Bean
    RestClientHttpServiceGroupConfigurer requestIdHttpServiceGroupConfigurer() {
        RequestIdRestClientInterceptor interceptor = new RequestIdRestClientInterceptor();
        return groups -> groups.forEachClient((group, builder) ->
                builder.requestInterceptor(interceptor)
        );
    }
}
