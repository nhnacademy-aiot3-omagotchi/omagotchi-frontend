package site.omagotchi.frontend.account.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.account.application.AdminAccountErrorCode;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorContractResolver;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.http.RestClientCallExecutor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class LearningRestCohortManagerClientTest {

    private static final String BASE_URL = "http://learning-service:8080";
    private static final String SEARCH_PATH = "/api/v1/cohorts/managers/search";
    private static final String ACCESS_TOKEN = "admin-token";
    private static final UUID USER_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000000001"
    );

    private LearningRestCohortManagerClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        LearningCohortManagerHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(LearningCohortManagerHttpService.class);
        client = new LearningRestCohortManagerClient(
                httpService,
                new RestClientCallExecutor(),
                new ApiErrorContractResolver(new ApiErrorResponseDecoder())
        );
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("Learning 기수 관리자 일괄 응답의 Application 결과 변환")
    void mapsLearningWireAssignmentsToApplicationResult() {
        // Given: 사용자별 기수 관리자 배정을 포함한 Learning 응답
        server.expect(once(), requestTo(BASE_URL + SEARCH_PATH))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("{\"userIds\":[\"" + USER_ID + "\"]}"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                [{
                                  "userId": "00000000-0000-0000-0000-000000000001",
                                  "cohorts": [{
                                    "cohortId": 3,
                                    "cohortName": "AIoT 3기",
                                    "role": "MANAGER"
                                  }]
                                }]
                                """));

        // When: 사용자 ID 목록의 기수 관리자 배정 조회
        Map<UUID, List<AdminManagedCohort>> result =
                client.findManagedCohorts(ACCESS_TOKEN, List.of(USER_ID));

        // Then: 사용자 ID를 Key로 하는 Application 결과 반환
        assertThat(result.get(USER_ID)).singleElement().satisfies(cohort -> {
            assertThat(cohort.cohortId()).isEqualTo(3L);
            assertThat(cohort.role()).isEqualTo("MANAGER");
        });
    }

    @Test
    @DisplayName("Learning 기수 관리자 기간 중복 오류 보존")
    void mapsApprovedLearningConflict() {
        // Given: Learning의 승인된 기수 관리자 기간 중복 응답
        String path = "/api/v1/cohorts/3/managers";
        server.expect(once(), requestTo(BASE_URL + path))
                .andRespond(withStatus(HttpStatus.CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "COHORT_MANAGER_PERIOD_CONFLICT",
                                  "message": "downstream message",
                                  "path": "%s",
                                  "requestId": "request-id"
                                }
                                """.formatted(path)));

        // When & Then: Frontend의 동일 공개 오류로 변환
        assertThatThrownBy(() -> client.assignManager(ACCESS_TOKEN, USER_ID, 3L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(AdminAccountErrorCode.COHORT_MANAGER_PERIOD_CONFLICT));
    }

    @Test
    @DisplayName("조회 API에 허용되지 않은 Learning 업무 오류 거부")
    void rejectsAssignmentErrorFromSearchEndpoint() {
        // Given: 조회 Endpoint 계약에 없는 관리자 기간 중복 응답
        server.expect(once(), requestTo(BASE_URL + SEARCH_PATH))
                .andRespond(withStatus(HttpStatus.CONFLICT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "code": "COHORT_MANAGER_PERIOD_CONFLICT",
                                  "message": "downstream message",
                                  "path": "%s",
                                  "requestId": "request-id"
                                }
                                """.formatted(SEARCH_PATH)));

        // When & Then: 다른 Endpoint의 업무 오류를 잘못된 하류 계약으로 처리
        assertThatThrownBy(() -> client.findManagedCohorts(
                ACCESS_TOKEN,
                List.of(USER_ID)
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("Learning 기수 관리자 지정 요청 계약")
    void assignsManagerOnExpectedSuccessStatus() {
        // Given: 기수 관리자 지정의 Learning 200 응답
        String path = "/api/v1/cohorts/3/managers";
        server.expect(once(), requestTo(BASE_URL + path))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("{\"userId\":\"" + USER_ID + "\"}"))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 기수 관리자 지정
        client.assignManager(ACCESS_TOKEN, USER_ID, 3L);

        // Then: 합의된 Method·Header·Body로 한 번 호출
    }

    @Test
    @DisplayName("Learning 기수 관리자 해제 요청 계약")
    void removesManagerOnExpectedSuccessStatus() {
        // Given: 기수 관리자 해제의 Learning 200 응답
        String path = "/api/v1/cohorts/3/members/" + USER_ID + "/role";
        server.expect(once(), requestTo(BASE_URL + path))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header("Authorization", "Bearer " + ACCESS_TOKEN))
                .andExpect(content().json("{\"role\":\"STUDENT\"}"))
                .andRespond(withStatus(HttpStatus.OK));

        // When: 기수 관리자 해제
        client.removeManager(ACCESS_TOKEN, USER_ID, 3L);

        // Then: STUDENT 역할 변경 계약으로 한 번 호출
    }

    @Test
    @DisplayName("예상하지 않은 Learning 성공 Status 거부")
    void rejectsUnexpectedMutationSuccessStatusAsBadGateway() {
        // Given: 기수 관리자 지정의 예상하지 않은 201 응답
        String path = "/api/v1/cohorts/3/managers";
        server.expect(once(), requestTo(BASE_URL + path))
                .andRespond(withStatus(HttpStatus.CREATED));

        // When & Then: 성공 응답 계약 위반으로 거부
        assertThatThrownBy(() -> client.assignManager(ACCESS_TOKEN, USER_ID, 3L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }

    @Test
    @DisplayName("Learning 5xx 응답의 서비스 이용 불가 변환")
    void mapsLearningServerFailureToServiceUnavailable() {
        // Given: Learning Gateway 오류
        server.expect(once(), requestTo(BASE_URL + SEARCH_PATH))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        // When & Then: 하류 장애를 Frontend 503 계약으로 변환
        assertThatThrownBy(() -> client.findManagedCohorts(
                ACCESS_TOKEN, List.of(USER_ID)
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.SERVICE_UNAVAILABLE));
    }

    @Test
    @DisplayName("중복된 Learning 사용자 응답 거부")
    void rejectsDuplicateLearningUserAsBadGateway() {
        // Given: 같은 사용자 ID가 두 번 포함된 Learning 성공 응답
        server.expect(once(), requestTo(BASE_URL + SEARCH_PATH))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                [
                                  {"userId":"%s","cohorts":[]},
                                  {"userId":"%s","cohorts":[]}
                                ]
                                """.formatted(USER_ID, USER_ID)));

        // When & Then: 잘못된 하류 응답 오류로 거부
        assertThatThrownBy(() -> client.findManagedCohorts(
                ACCESS_TOKEN, List.of(USER_ID)
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
