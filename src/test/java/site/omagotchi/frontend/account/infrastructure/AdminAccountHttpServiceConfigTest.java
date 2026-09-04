package site.omagotchi.frontend.account.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import site.omagotchi.frontend.account.infrastructure.request.LearningAssignCohortManagerRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningChangeCohortMemberRoleRequest;
import site.omagotchi.frontend.account.infrastructure.request.LearningCohortManagerSearchRequest;
import site.omagotchi.frontend.account.infrastructure.response.IdentityAdminAccountResponse;
import site.omagotchi.frontend.account.infrastructure.response.LearningUserManagedCohortsResponse;
import site.omagotchi.frontend.global.http.response.PageResponse;

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
@Import(AdminAccountHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class AdminAccountHttpServiceConfigTest {

    private static final String IDENTITY_BASE_URL = "http://localhost:8083";
    private static final String LEARNING_BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer admin-token";

    @Autowired
    private IdentityAdminAccountHttpService identityHttpService;

    @Autowired
    private LearningCohortManagerHttpService learningHttpService;

    @Autowired
    private MockHttpServiceConfiguration mockConfiguration;

    @BeforeEach
    void resetMockServers() {
        mockConfiguration.identityServer().reset();
        mockConfiguration.learningServer().reset();
    }

    @AfterEach
    void verifyMockServers() {
        mockConfiguration.identityServer().verify();
        mockConfiguration.learningServer().verify();
    }

    @Test
    @DisplayName("관리자 계정 목록의 Identity 직접 호출 설정")
    void callsIdentityAdminApiDirectly() {
        // Given: Identity 관리자 계정 목록 응답
        MockRestServiceServer identityServer = mockConfiguration.identityServer();
        identityServer.expect(once(), requestTo(IDENTITY_BASE_URL
                        + "/api/v1/admin/users?query=kim&page=0&size=20&sort=NAME_ASC"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "items": [],
                          "page": {"number":0,"size":20,"totalElements":0,"totalPages":0}
                        }
                        """, MediaType.APPLICATION_JSON));

        // When: 관리자 계정 목록 HTTP Service 호출
        ResponseEntity<PageResponse<IdentityAdminAccountResponse>> response = identityHttpService.getUsers(
                BEARER, "kim", null, null, null, 0, 20, "NAME_ASC");

        // Then: Identity 주소와 공통 페이지 응답 계약 사용
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().items()).isEmpty();
        assertThat(response.getBody().page().number()).isZero();
    }

    @Test
    @DisplayName("기수 관리자 일괄 조회의 Learning 직접 호출 설정")
    void callsLearningManagerSearchApiDirectly() {
        // Given: Learning 기수 관리자 일괄 조회 응답
        UUID accountId = UUID.randomUUID();
        MockRestServiceServer learningServer = mockConfiguration.learningServer();
        learningServer.expect(once(), requestTo(LEARNING_BASE_URL
                        + "/api/v1/cohorts/managers/search"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"userIds\":[\"" + accountId + "\"]}"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        // When: 기수 관리자 일괄 조회 HTTP Service 호출
        ResponseEntity<List<LearningUserManagedCohortsResponse>> response =
                learningHttpService.searchManagedCohorts(
                BEARER,
                new LearningCohortManagerSearchRequest(List.of(accountId))
        );

        // Then: Learning 주소와 요청 Body 계약 사용
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    @DisplayName("기수 관리자 지정의 Learning 직접 호출 설정")
    void callsLearningManagerAssignmentApiDirectly() {
        // Given: Learning 기수 관리자 지정 응답
        UUID accountId = UUID.randomUUID();
        MockRestServiceServer learningServer = mockConfiguration.learningServer();
        learningServer.expect(once(), requestTo(LEARNING_BASE_URL
                        + "/api/v1/cohorts/3/managers"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"userId\":\"" + accountId + "\"}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        // When: 기수 관리자 지정 HTTP Service 호출
        learningHttpService.assignManager(
                BEARER, 3L, new LearningAssignCohortManagerRequest(accountId));

        // Then: Learning 주소와 지정 요청 계약 사용
    }

    @Test
    @DisplayName("기수 관리자 해제의 Learning 직접 호출 설정")
    void callsLearningManagerRemovalApiDirectly() {
        // Given: Learning 기수 관리자 해제 응답
        UUID accountId = UUID.randomUUID();
        MockRestServiceServer learningServer = mockConfiguration.learningServer();
        learningServer.expect(once(), requestTo(LEARNING_BASE_URL
                        + "/api/v1/cohorts/3/members/" + accountId + "/role"))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andExpect(content().json("{\"role\":\"STUDENT\"}"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        // When: 기수 관리자 해제 HTTP Service 호출
        learningHttpService.changeMemberRole(
                BEARER,
                3L,
                accountId,
                new LearningChangeCohortMemberRoleRequest("STUDENT")
        );

        // Then: Learning 주소와 역할 변경 요청 계약 사용
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private MockRestServiceServer identityServer;
        private MockRestServiceServer learningServer;

        @Bean
        RestClientHttpServiceGroupConfigurer adminAccountMockServerConfigurer() {
            return groups -> {
                groups.filterByName(AdminAccountHttpServiceConfig.IDENTITY_GROUP_NAME)
                        .forEachClient((ignoredGroup, builder) ->
                                identityServer = MockRestServiceServer.bindTo(builder).build()
                        );
                groups.filterByName(AdminAccountHttpServiceConfig.LEARNING_GROUP_NAME)
                        .forEachClient((ignoredGroup, builder) ->
                                learningServer = MockRestServiceServer.bindTo(builder).build()
                        );
            };
        }

        MockRestServiceServer identityServer() {
            return Objects.requireNonNull(identityServer, "Identity Mock Server 미등록");
        }

        MockRestServiceServer learningServer() {
            return Objects.requireNonNull(learningServer, "Learning Mock Server 미등록");
        }
    }
}
