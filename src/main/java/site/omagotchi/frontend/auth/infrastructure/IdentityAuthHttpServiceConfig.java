package site.omagotchi.frontend.auth.infrastructure;

import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.core.Ordered;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import org.springframework.web.service.registry.ImportHttpServices;

import java.nio.charset.StandardCharsets;

// Identity HTTP Service 등록과 Frontend 프로세스 인증 설정
@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = IdentityAuthHttpServiceConfig.GROUP_NAME,
        types = {
                IdentityAuthHttpService.class,
                IdentitySignupV2HttpService.class,
                IdentityAccountHttpService.class
        }
)
class IdentityAuthHttpServiceConfig {

    // HTTP Service 설정 묶음과 기본 Discovery service ID
    static final String GROUP_NAME = "identity-service";

    @Bean
    HttpComponentsClientHttpRequestFactory identityClientHttpRequestFactory(
            HttpClientSettings settings
    ) {
        return ClientHttpRequestFactoryBuilder.httpComponents()
                .withHttpClientCustomizer(HttpClientBuilder::disableAutomaticRetries)
                .build(settings);
    }

    @Bean
    RestClientHttpServiceGroupConfigurer identityAuthHttpServiceConfigurer(
            IdentityClientCredentialProperties properties,
            HttpComponentsClientHttpRequestFactory identityClientHttpRequestFactory
    ) {
        return new RestClientHttpServiceGroupConfigurer() {
            @Override
            public void configureGroups(Groups<RestClient.Builder> groups) {
                groups.filterByName(GROUP_NAME)
                        .forEachClient((group, builder) -> builder
                                .requestFactory(identityClientHttpRequestFactory)
                                .defaultHeaders(headers -> headers.setBasicAuth(
                                        properties.username(),
                                        properties.password(),
                                        StandardCharsets.UTF_8
                                ))
                        );
            }

            @Override
            public int getOrder() {
                return Ordered.HIGHEST_PRECEDENCE + 20;
            }
        };
    }
}
