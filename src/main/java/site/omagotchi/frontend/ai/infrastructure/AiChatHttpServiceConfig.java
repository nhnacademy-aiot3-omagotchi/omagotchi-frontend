package site.omagotchi.frontend.ai.infrastructure;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.boot.http.client.reactive.ClientHttpConnectorBuilder;
import org.springframework.boot.http.client.reactive.ReactorClientHttpConnectorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.client.ReactorResourceFactory;
import org.springframework.http.client.reactive.ClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientHttpServiceGroupConfigurer;
import org.springframework.web.service.registry.HttpServiceGroup.ClientType;
import org.springframework.web.service.registry.ImportHttpServices;

@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = AiChatHttpServiceConfig.GROUP_NAME,
        types = AiChatHttpService.class,
        clientType = ClientType.WEB_CLIENT
)
@SuppressWarnings("java:S1118") // Spring이 인스턴스화하는 설정 클래스이므로 private 생성자를 둘 수 없다.
public class AiChatHttpServiceConfig {

    static final String GROUP_NAME = "learning-ai-service";

    /**
     * AI 채팅 그룹의 WebClient에만 읽기 타임아웃이 긴 커넥터를 물린다.
     *
     * <p><b>커넥터를 빈으로 노출하지 않는다.</b> {@code ClientHttpConnector} 타입 빈이 있으면
     * {@code ReactiveHttpClientAutoConfiguration}의 전역 커넥터가
     * {@code @ConditionalOnMissingBean}으로 물러나고, {@code WebClientAutoConfiguration}의
     * {@code webClientHttpConnectorCustomizer}가 그것을 <b>모든</b> WebClient에 적용한다.
     * 그러면 identity 등 다른 호출까지 이 타임아웃을 쓰게 된다.</p>
     *
     * <p><b>순서가 0보다 뒤여야 한다.</b> Boot의 {@code WebClientCustomizerHttpServiceGroupConfigurer}가
     * order 0에서 전역 커넥터를 다시 걸기 때문에, 그보다 앞서면 이 설정이 덮여 무효가 된다.
     * {@code spring.http.serviceclient.<group>.read-timeout} 프로퍼티가 듣지 않는 이유도 같다
     * (그쪽은 order {@code Integer.MIN_VALUE}에서 적용된다).</p>
     */
    @Bean
    WebClientHttpServiceGroupConfigurer aiChatHttpServiceGroupConfigurer(
            HttpClientSettings httpClientSettings,
            AiChatClientProperties properties,
            ObjectProvider<ReactorResourceFactory> reactorResourceFactory
    ) {
        // 커넥션 풀·이벤트 루프는 Boot이 관리하는 것을 그대로 쓴다.
        // 넘기지 않으면 reactor-netty 전역 리소스를 쓰게 되어 이 클라이언트만 컨텍스트 생명주기 밖에 놓인다
        ReactorClientHttpConnectorBuilder connectorBuilder = ClientHttpConnectorBuilder.reactor();
        ReactorResourceFactory resourceFactory = reactorResourceFactory.getIfAvailable();
        if (resourceFactory != null) {
            connectorBuilder = connectorBuilder.withReactorResourceFactory(resourceFactory);
        }

        // 읽기 타임아웃만 바꾸고 연결 타임아웃·SSL·리다이렉트는 전역 설정을 그대로 물려받는다
        ClientHttpConnector connector =
                connectorBuilder.build(httpClientSettings.withReadTimeout(properties.readTimeout()));

        return new WebClientHttpServiceGroupConfigurer() {
            @Override
            public void configureGroups(Groups<WebClient.Builder> groups) {
                groups.filterByName(GROUP_NAME)
                        .forEachClient((group, builder) -> builder.clientConnector(connector));
            }

            @Override
            public int getOrder() {
                return Ordered.LOWEST_PRECEDENCE;
            }
        };
    }
}
