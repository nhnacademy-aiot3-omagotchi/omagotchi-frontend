package site.omagotchi.frontend.learning.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import site.omagotchi.frontend.learning.infrastructure.response.AttendanceRecordPageResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LearningHttpServiceContractTest {

    private static final String BASE_URL = "http://localhost:8084";
    private static final String BEARER = "Bearer test-access-token";

    private MockRestServiceServer server;
    private LearningHttpService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(builder.build()))
                .build()
                .createClient(LearningHttpService.class);
    }

    @Test
    void mapsAttendanceDateRangeAndPagination() {
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/cohorts/7/attendance-records/me"
                        + "?from=2026-08-01&to=2026-08-21&page=1&size=10"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(withSuccess("""
                        {
                          "items": [{"id": 3, "attendanceDate": "2026-08-20"}],
                          "page": {"number": 1, "size": 10, "totalElements": 13, "totalPages": 2}
                        }
                        """, MediaType.APPLICATION_JSON));

        AttendanceRecordPageResponse response = service.getMyAttendanceRecords(
                BEARER,
                7L,
                LocalDate.of(2026, 8, 1).toString(),
                LocalDate.of(2026, 8, 21).toString(),
                1,
                10
        );

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().id()).isEqualTo(3L);
        assertThat(response.page().totalElements()).isEqualTo(13L);
        server.verify();
    }

    @Test
    void relaysAttachmentBodyAndDownloadHeaders() throws IOException {
        server.expect(once(), requestTo(BASE_URL
                        + "/api/v1/community/posts/11/attachments/29"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, BEARER))
                .andRespond(request -> withSuccess("attachment-content", MediaType.TEXT_PLAIN)
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=note.txt")
                        .createResponse(request));

        ResponseEntity<org.springframework.core.io.Resource> response =
                service.downloadCommunityAttachment(BEARER, 11L, 29L);

        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("note.txt");
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContentAsString(StandardCharsets.UTF_8))
                .isEqualTo("attachment-content");
        server.verify();
    }
}
