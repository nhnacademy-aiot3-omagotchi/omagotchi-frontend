package site.omagotchi.frontend.global.learning.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import site.omagotchi.frontend.attendance.infrastructure.AttendanceHttpService;
import site.omagotchi.frontend.learning.sensor.infrastructure.SensorAdminHttpService;
import site.omagotchi.frontend.learning.series.infrastructure.SensorHttpService;
import site.omagotchi.frontend.presence.infrastructure.PresenceHttpService;

import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@SpringBootTest
@ActiveProfiles("test")
@Import(LearningHttpServiceConfigTest.MockHttpServiceConfiguration.class)
class LearningHttpServiceConfigTest {

    private static final String LEARNING_BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

    @Autowired
    private LearningHttpService learningHttpService;

    @Autowired
    private AttendanceHttpService attendanceHttpService;

    @Autowired
    private SensorHttpService sensorHttpService;

    @Autowired
    private SensorAdminHttpService sensorAdminHttpService;

    @Autowired
    private PresenceHttpService presenceHttpService;

    @Autowired
    private MockHttpServiceConfiguration mockHttpServiceConfiguration;

    @Test
    @DisplayName("Learning 선언형 Client 5개 등록과 Learning Service 직접 호출")
    void registersFiveClientsAndUsesLearningServiceBaseUrl() {
        // Given: 실제 Learning Group 설정에 연결된 Mock 응답
        MockRestServiceServer server = mockHttpServiceConfiguration.server();
        server.expect(once(), requestTo(LEARNING_BASE_URL + "/api/v1/cohorts"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        // When: 같은 Group에 등록된 대표 HTTP Service Interface 호출
        learningHttpService.getCohorts(BEARER);

        // Then: Group 이름, 5개 Client Bean, Learning Base URL과 사용자 Bearer Header
        assertThat(LearningHttpServiceConfig.GROUP_NAME).isEqualTo("learning-service");
        assertThat(learningHttpService).isNotNull();
        assertThat(attendanceHttpService).isNotNull();
        assertThat(sensorHttpService).isNotNull();
        assertThat(sensorAdminHttpService).isNotNull();
        assertThat(presenceHttpService).isNotNull();
        server.verify();
    }

    // 실제 HTTP Service Group Builder에 Mock Server 연결
    @TestConfiguration(proxyBeanMethods = false)
    static class MockHttpServiceConfiguration {

        private MockRestServiceServer server;

        @Bean
        RestClientHttpServiceGroupConfigurer learningMockServerConfigurer() {
            return groups -> groups
                    .filterByName(LearningHttpServiceConfig.GROUP_NAME)
                    .forEachClient((ignoredGroup, builder) ->
                            server = MockRestServiceServer.bindTo(builder).build()
                    );
        }

        MockRestServiceServer server() {
            return Objects.requireNonNull(server, "Learning Mock Server 미등록");
        }
    }
}
