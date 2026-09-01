package site.omagotchi.frontend.attendance.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.exception.BusinessException;
import site.omagotchi.frontend.global.exception.CommonErrorCode;
import site.omagotchi.frontend.global.http.ApiErrorResponseDecoder;
import site.omagotchi.frontend.global.learning.infrastructure.LearningGatewayCallExecutor;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class LearningRestAttendanceClientTest {

    private static final String BASE_URL = "http://learning-service:8080";
    private static final String BEARER_TOKEN = "Bearer access-token";

    private LearningRestAttendanceClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        AttendanceHttpService httpService = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(AttendanceHttpService.class);
        client = new LearningRestAttendanceClient(
                httpService,
                new LearningGatewayCallExecutor(new ApiErrorResponseDecoder())
        );
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("Learning 출결 items·page 응답의 Application 결과 변환")
    void mapsLearningAttendancePageToApplicationResult() {
        // Given: 필수 출결 정보와 페이지 메타데이터를 포함한 Learning 응답
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/cohorts/7/attendance-records/me"
                        + "?from=2026-08-01&to=2026-08-21&page=1&size=10"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "id": 3,
                                    "attendanceDate": "2026-08-20",
                                    "autoStatus": "PRESENT",
                                    "finalStatus": "PRESENT",
                                    "checkedInAt": "2026-08-20T00:00:00Z",
                                    "checkedOutAt": null,
                                    "lateMinutes": 0,
                                    "earlyLeaveMinutes": 0,
                                    "version": 1,
                                    "createdAt": "2026-08-20T00:00:00Z",
                                    "updatedAt": "2026-08-20T00:00:00Z"
                                  }],
                                  "page": {
                                    "number": 1,
                                    "size": 10,
                                    "totalElements": 13,
                                    "totalPages": 2
                                  }
                                }
                                """));

        // When: 출결 이력 페이지 조회
        AttendancePageResult result = client.getHistory(
                BEARER_TOKEN,
                7L,
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 21),
                1,
                10
        );

        // Then: HTTP 타입이 없는 Application 결과 반환
        assertThat(result.items()).singleElement().satisfies(record -> {
            assertThat(record.attendanceDate()).isEqualTo(LocalDate.of(2026, 8, 20));
            assertThat(record.finalStatus()).isEqualTo("PRESENT");
        });
        assertThat(result.page()).isEqualTo(new PageMetadata(1, 10, 13, 2));
    }

    @Test
    @DisplayName("Learning 출결 필수 필드 누락의 잘못된 하류 응답 처리")
    void rejectsMissingRequiredAttendanceField() {
        // Given: finalStatus가 누락된 Learning 성공 응답
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/cohorts/7/attendance-records/me?page=0&size=20"))
                .andRespond(withStatus(HttpStatus.OK)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {
                                  "items": [{
                                    "id": 3,
                                    "attendanceDate": "2026-08-20",
                                    "autoStatus": "PRESENT",
                                    "finalStatus": null,
                                    "version": 1,
                                    "createdAt": "2026-08-20T00:00:00Z",
                                    "updatedAt": "2026-08-20T00:00:00Z"
                                  }],
                                  "page": {
                                    "number": 0,
                                    "size": 20,
                                    "totalElements": 1,
                                    "totalPages": 1
                                  }
                                }
                                """));

        // When & Then: 잘못된 하류 응답 오류로 거부
        assertThatThrownBy(() -> client.getHistory(
                BEARER_TOKEN,
                7L,
                null,
                null,
                0,
                20
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getErrorCode())
                        .isEqualTo(CommonErrorCode.DOWNSTREAM_INVALID_RESPONSE));
    }
}
