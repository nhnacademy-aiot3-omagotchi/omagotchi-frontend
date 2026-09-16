package site.omagotchi.frontend.attendance.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.cookies.RequestCookiesSnippet;
import org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.PayloadDocumentation;
import org.springframework.restdocs.request.ParameterDescriptor;
import org.springframework.restdocs.request.RequestDocumentation;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.attendance.application.AttendanceBffService;
import site.omagotchi.frontend.attendance.application.result.AttendancePageResult;
import site.omagotchi.frontend.attendance.application.result.AttendanceRecordResult;
import site.omagotchi.frontend.attendance.application.result.CurrentPresenceResult;
import site.omagotchi.frontend.attendance.infrastructure.response.LearningAttendanceRecordResponse;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.global.http.response.PageInfo;
import site.omagotchi.frontend.global.http.response.PageResponse;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({AttendanceBffController.class, AdminAttendanceBffController.class})
class AttendanceBffDocumentationTest extends FrontendRestDocsTestSupport {
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000820001");

    @MockitoBean
    private AttendanceBffService service;

    @Autowired
    private MockMvc mvc;

    @TestConfiguration(proxyBeanMethods = false)
    static class AttendanceDocumentationBeans {
        @Bean
        FixtureProxy fixtureProxy() {
            return new FixtureProxy();
        }
    }

    private static MockCookie cookie() {
        return new MockCookie("SESSION", "[SESSION_ID]");
    }

    private static RequestCookiesSnippet cookies() {
        return requestCookies(
                CookieDocumentation.cookieWithName("SESSION")
                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다."));
    }

    private static FieldDescriptor[] recordFields() {
        return new FieldDescriptor[] {
            fieldWithPath("attendanceDate").description("출석 날짜"),
            fieldWithPath("autoStatus").description("자동 출석 상태"),
            fieldWithPath("finalStatus").description("최종 출석 상태"),
            fieldWithPath("checkedInAt").description("입실 시각"),
            fieldWithPath("checkedOutAt").description("퇴실 시각"),
            fieldWithPath("lateMinutes").description("지각 시간(분)"),
            fieldWithPath("earlyLeaveMinutes").description("조퇴 시간(분)")
        };
    }

    private static AttendanceRecordResult record() {
        return new AttendanceRecordResult(
                LocalDate.of(2026, 9, 14),
                "PRESENT",
                "PRESENT",
                Instant.parse("2026-09-14T00:00:00Z"),
                Instant.parse("2026-09-14T09:00:00Z"),
                0,
                0);
    }

    private static PageMetadata page() {
        return new PageMetadata(0, 20, 1, 1);
    }

    private static FieldDescriptor[] pageFields(String item) {
        return new FieldDescriptor[] {
            fieldWithPath("items").description("출결 목록"),
            fieldWithPath("items[]").description("출결 항목"),
            fieldWithPath("items[].attendanceDate").description("출결 날짜"),
            fieldWithPath("items[].autoStatus").description("자동 상태"),
            fieldWithPath("items[].finalStatus").description("최종 상태"),
            fieldWithPath("items[].checkedInAt").description("입실 시각"),
            fieldWithPath("items[].checkedOutAt").description("퇴실 시각"),
            fieldWithPath("items[].lateMinutes").description("지각 분"),
            fieldWithPath("items[].earlyLeaveMinutes").description("조퇴 분"),
            fieldWithPath("page.number").description("페이지 번호"),
            fieldWithPath("page.size").description("페이지 크기"),
            fieldWithPath("page.totalElements").description("전체 항목 수"),
            fieldWithPath("page.totalPages").description("전체 페이지 수")
        };
    }

    @Test
    @DisplayName("출결 이력 조회")
    void history() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.getHistory(any(), any(), any(), any()))
                .thenReturn(new AttendancePageResult(List.of(record()), page()));

        // When & Then
        mvc.perform(get("/bff/v1/attendance/history")
                        .param("from", "2026-09-01")
                        .param("to", "2026-09-14")
                        .param("page", "0")
                        .param("size", "20")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/history",
                        cookies(),
                        RequestDocumentation.queryParameters(
                                RequestDocumentation.parameterWithName("from")
                                        .description("시작일"),
                                RequestDocumentation.parameterWithName("to")
                                        .description("종료일"),
                                RequestDocumentation.parameterWithName("page")
                                        .description("페이지"),
                                RequestDocumentation.parameterWithName("size")
                                        .description("크기")),
                        PayloadDocumentation.responseFields(pageFields("items[]"))));
    }

    @Test
    @DisplayName("오늘 출결 조회")
    void today() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.getToday()).thenReturn(Optional.of(record()));

        // When & Then
        mvc.perform(get("/bff/v1/attendance/today")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/today",
                        cookies(),
                        PayloadDocumentation.responseFields(recordFields())));
    }

    @Test
    @DisplayName("현재 체류 조회")
    void currentPresence() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.getCurrentPresence())
                .thenReturn(
                        Optional.of(
                                new CurrentPresenceResult(
                                        301L, "PRESENT", Instant.parse("2026-09-14T01:00:00Z"))));

        // When & Then
        mvc.perform(get("/bff/v1/attendance/current-presence")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/current-presence",
                        cookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("spaceId").description("현재 공간 ID"),
                                fieldWithPath("state").description("체류 상태"),
                                fieldWithPath("startedAt").description("체류 시작 시각"))));
    }

    @Test
    @DisplayName("입실 처리")
    void checkIn() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.checkIn()).thenReturn(record());

        // When & Then
        mvc.perform(post("/bff/v1/attendance/check-in")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/check-in",
                        cookies(),
                        PayloadDocumentation.responseFields(recordFields())));
    }

    @Test
    @DisplayName("퇴실 처리")
    void checkOut() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.checkOut()).thenReturn(record());

        // When & Then
        mvc.perform(post("/bff/v1/attendance/check-out")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/check-out",
                        cookies(),
                        PayloadDocumentation.responseFields(recordFields())));
    }

    @Test
    @DisplayName("실습 공간 이동")
    void moveLab() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.moveLab(301L)).thenReturn(301L);

        // When & Then
        mvc.perform(post("/bff/v1/attendance/move-lab")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":301}"))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/move-lab",
                        cookies(),
                        PayloadDocumentation.requestFields(fieldWithPath("spaceId").description("이동할 실습 공간 ID")),
                        PayloadDocumentation.responseFields(fieldWithPath("spaceId").description("확정된 공간 ID"))));
    }

    @Test
    @DisplayName("학습 공간 이동")
    void moveStudy() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        when(service.moveStudySpace(301L)).thenReturn(301L);

        // When & Then
        mvc.perform(post("/bff/v1/attendance/move-study")
                        .cookie(cookie())
                        .session(authenticatedSession())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":301}"))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/move-study",
                        cookies(),
                        PayloadDocumentation.requestFields(fieldWithPath("spaceId").description("이동할 학습 공간 ID")),
                        PayloadDocumentation.responseFields(fieldWithPath("spaceId").description("확정된 공간 ID"))));
    }

    private static ParameterDescriptor cohort() {
        return RequestDocumentation.parameterWithName("cohort-id").description("관리 대상 기수 ID");
    }

    @Test
    @DisplayName("관리자 출결 정책 조회")
    void adminPolicy() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/attendance-policy", 7)
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/admin-policy-get",
                        cookies(),
                        RequestDocumentation.pathParameters(cohort()),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("checkInStartTime").description("입실 시작 시각"),
                                fieldWithPath("checkOutEndTime").description("퇴실 종료 시각"))));
    }

    @Test
    @DisplayName("관리자 출결 정책 수정")
    void adminPolicyUpdate() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.put(
                        "/bff/v1/admin/cohorts/{cohort-id}/attendance-policy", 7)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"checkInStartTime\":\"09:00\",\"checkOutEndTime\":\"18:00\"}"))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/admin-policy-put",
                        cookies(),
                        RequestDocumentation.pathParameters(cohort()),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("checkInStartTime").description("입실 시작 시각"),
                                fieldWithPath("checkOutEndTime").description("퇴실 종료 시각")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("checkInStartTime").description("입실 시작 시각"),
                                fieldWithPath("checkOutEndTime").description("퇴실 종료 시각"))));
    }

    @Test
    @DisplayName("관리자 출결 기록 조회")
    void adminRecords() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/attendance-records", 7)
                        .param("date", "2026-09-14")
                        .param("page", "0")
                        .param("size", "20")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "attendance-bff/admin-records",
                        cookies(),
                        RequestDocumentation.pathParameters(cohort()),
                        RequestDocumentation.queryParameters(
                                RequestDocumentation.parameterWithName("date")
                                        .description("조회일"),
                                RequestDocumentation.parameterWithName("page")
                                        .description("페이지"),
                                RequestDocumentation.parameterWithName("size")
                                        .description("크기")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("items").description("관리자 출결 목록"),
                                fieldWithPath("items[]").description("관리자 출결 항목"),
                                fieldWithPath("items[].id").description("출결 ID"),
                                fieldWithPath("items[].cohortMembershipId")
                                        .description("기수 멤버십 ID"),
                                fieldWithPath("items[].userId").description("사용자 ID"),
                                fieldWithPath("items[].nickname").description("닉네임"),
                                fieldWithPath("items[].attendanceDate")
                                        .description("출석 날짜"),
                                fieldWithPath("items[].autoStatus").description("자동 상태"),
                                fieldWithPath("items[].finalStatus").description("최종 상태"),
                                fieldWithPath("items[].checkedInAt").description("입실 시각"),
                                fieldWithPath("items[].checkedOutAt").description("퇴실 시각"),
                                fieldWithPath("items[].lateMinutes").description("지각 분"),
                                fieldWithPath("items[].earlyLeaveMinutes")
                                        .description("조퇴 분"),
                                fieldWithPath("page.number").description("페이지 번호"),
                                fieldWithPath("page.size").description("페이지 크기"),
                                fieldWithPath("page.totalElements").description("전체 수"),
                                fieldWithPath("page.totalPages").description("전체 페이지 수"))));
    }

    @Test
    @DisplayName("관리자 출결 상태 변경")
    void adminStatus() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.patch(
                        "/bff/v1/admin/cohorts/{cohort-id}/attendance-records/{attendance-id}/status",
                        7,
                        11)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"EXCUSED\"}"))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "attendance-bff/admin-status",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                cohort(),
                                RequestDocumentation.parameterWithName("attendance-id")
                                        .description("출결 ID")),
                        PayloadDocumentation.requestFields(fieldWithPath("status").description("변경할 출결 상태"))));
    }

    private static final class FixtureProxy extends LearningProxyBffService {
        FixtureProxy() {
            super(null, null, null);
        }

        @Override
        public <T> T execute(
                HttpServletRequest r,
                Function<AuthorizedLearningRequest, T> op) {
            if (r.getRequestURI().endsWith("attendance-records"))
                return (T)
                        new PageResponse<>(
                                List.of(
                                        new LearningAttendanceRecordResponse(
                                                11L,
                                                22L,
                                                USER,
                                                "오마",
                                                LocalDate.of(2026, 9, 14),
                                                "PRESENT",
                                                "PRESENT",
                                                Instant.parse("2026-09-14T00:00:00Z"),
                                                null,
                                                0,
                                                0)),
                                new PageInfo(0, 20, 1, 1));
            return (T)
                    JsonMapper.builder()
                            .build()
                            .createObjectNode()
                            .put("checkInStartTime", "09:00")
                            .put("checkOutEndTime", "18:00");
        }
    }
}
