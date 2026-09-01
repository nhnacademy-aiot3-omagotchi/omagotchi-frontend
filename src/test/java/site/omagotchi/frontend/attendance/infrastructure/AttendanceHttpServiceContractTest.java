package site.omagotchi.frontend.attendance.infrastructure;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.global.http.response.PageResponse;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AttendanceHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

    private MockRestServiceServer server;
    private AttendanceHttpService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(AttendanceHttpService.class);
    }

    @AfterEach
    void verifyServer() {
        server.verify();
    }

    @Test
    @DisplayName("출결 기간·페이지 조회 HTTP 계약")
    void mapsAttendanceDateRangeAndPagination() {
        // Given: 출결 항목과 공통 페이지 메타데이터를 포함한 Learning 응답
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/cohorts/7/attendance-records/me"
                        + "?from=2026-08-01&to=2026-08-21&page=1&size=10"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "items": [{"id": 3, "attendanceDate": "2026-08-20"}],
                          "page": {"number": 1, "size": 10, "totalElements": 13, "totalPages": 2}
                        }
                        """, MediaType.APPLICATION_JSON));

        // When: 기간과 페이지 조건을 포함한 출결 이력 조회
        PageResponse<LearningAttendanceRecordResponse> response = service.getMyAttendanceRecords(
                BEARER,
                7L,
                LocalDate.of(2026, 8, 1).toString(),
                LocalDate.of(2026, 8, 21).toString(),
                1,
                10
        );

        // Then: 요청 조건 전달과 items·page 응답 역직렬화
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().attendanceDate())
                .isEqualTo(LocalDate.of(2026, 8, 20));
        assertThat(response.page().totalElements()).isEqualTo(13L);
    }

    @Test
    @DisplayName("출석 처리 HTTP 계약")
    void mapsCheckInToAttendanceEndpoint() {
        // Given: 출석 처리 성공 응답
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/cohorts/7/attendance-records/check-in"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {"id": 4, "attendanceDate": "2026-08-24"}
                        """, MediaType.APPLICATION_JSON));

        // When: 출석 처리 요청
        LearningAttendanceRecordResponse response = service.checkIn(BEARER, 7L);

        // Then: 합의된 Endpoint 호출과 응답 역직렬화
        assertThat(response.attendanceDate()).isEqualTo(LocalDate.of(2026, 8, 24));
    }
}
