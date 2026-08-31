package site.omagotchi.frontend.account.infrastructure;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import site.omagotchi.frontend.account.infrastructure.request.GatewayCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.GatewayChangeCohortMemberRoleRequest;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
@ActiveProfiles("test")
@Import(AdminAccountGatewayHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class AdminAccountGatewayHttpServiceConfigTest {

    private static final String GATEWAY_BASE_URL = "http://localhost:8080";
    private static final String BEARER = "Bearer admin-token";

    @Autowired
    private AdminAccountGatewayHttpService httpService;

    @Autowired
    private MockHttpServiceConfiguration mockConfiguration;

    @Test
    void callsIdentityAndLearningAdminApisThroughGateway() {
        UUID accountId = UUID.randomUUID();
        MockRestServiceServer server = mockConfiguration.server();
        server.expect(once(), requestTo(GATEWAY_BASE_URL
                        + "/api/v1/admin/users?query=kim&page=0&size=20&sort=NAME_ASC"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {"content":[],"page":0,"size":20,"totalElements":0,"totalPages":0}
                        """, MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(GATEWAY_BASE_URL + "/api/v1/cohorts/managers/search"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"userIds\":[\"" + accountId + "\"]}"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(GATEWAY_BASE_URL + "/api/v1/cohorts/3/managers"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"userId\":\"" + accountId + "\"}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(GATEWAY_BASE_URL
                        + "/api/v1/cohorts/3/members/" + accountId + "/role"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"role\":\"STUDENT\"}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        var page = httpService.getUsers(BEARER, "kim", null, null, 0, 20, "NAME_ASC");
        var managers = httpService.searchManagedCohorts(
                BEARER,
                new GatewayCohortManagerSearchRequest(List.of(accountId))
        );
        httpService.assignManager(BEARER, 3L, new GatewayAssignCohortManagerRequest(accountId));
        httpService.changeMemberRole(
                BEARER,
                3L,
                accountId,
                new GatewayChangeCohortMemberRoleRequest("STUDENT")
        );

        assertThat(page.content()).isEmpty();
        assertThat(managers).isEmpty();
        assertThat(AdminAccountGatewayHttpServiceConfig.GROUP_NAME).isEqualTo("gateway-service");
        server.verify();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private MockRestServiceServer server;

        @Bean
        RestClientHttpServiceGroupConfigurer gatewayMockServerConfigurer() {
            return groups -> groups
                    .filterByName(AdminAccountGatewayHttpServiceConfig.GROUP_NAME)
                    .forEachClient((ignoredGroup, builder) ->
                            server = MockRestServiceServer.bindTo(builder).build()
                    );
        }

        MockRestServiceServer server() {
            return Objects.requireNonNull(server, "Gateway Mock Server 미등록");
        }
    }
}
