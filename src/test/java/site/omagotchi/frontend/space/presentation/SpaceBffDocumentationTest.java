package site.omagotchi.frontend.space.presentation;

import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.cookies.RequestCookiesSnippet;
import org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.PayloadDocumentation;
import org.springframework.restdocs.request.RequestDocumentation;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.application.result.OccupancyParticipantView;
import site.omagotchi.frontend.space.application.result.OccupancyView;
import site.omagotchi.frontend.space.application.result.ParticipantCandidateView;
import site.omagotchi.frontend.space.application.result.SelectableLabView;
import site.omagotchi.frontend.space.application.result.SpaceView;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest(SpaceBffController.class)
class SpaceBffDocumentationTest extends FrontendRestDocsTestSupport {
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-000000830001");

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private SpaceBffService service;

    private static MockCookie cookie() {
        return new MockCookie("SESSION", "[SESSION_ID]");
    }

    private static RequestCookiesSnippet cookies() {
        return requestCookies(
                CookieDocumentation.cookieWithName("SESSION")
                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다."));
    }

    private static FieldDescriptor[] occupancy() {
        return new FieldDescriptor[] {
            fieldWithPath("occupancyId").description("점유 ID"),
            fieldWithPath("spaceId").description("공간 ID"),
            fieldWithPath("status").description("점유 상태"),
            fieldWithPath("startedAt").description("시작 시각"),
            fieldWithPath("expiresAt").description("만료 시각"),
            fieldWithPath("extensionCount").description("연장 횟수"),
            fieldWithPath("remainingSeconds").description("남은 시간(초)")
        };
    }

    private static SpaceView space() {
        return new SpaceView(
                3L,
                "회의실 A",
                "MEETING",
                8,
                "ACTIVE",
                null,
                null,
                "OCCUPIED",
                OffsetDateTime.parse("2026-09-14T10:00:00+09:00"),
                1200L,
                true,
                true,
                true,
                2,
                3);
    }

    private static OccupancyView occ() {
        return new OccupancyView(
                9L,
                3L,
                "ACTIVE",
                OffsetDateTime.parse("2026-09-14T09:00:00+09:00"),
                OffsetDateTime.parse("2026-09-14T11:00:00+09:00"),
                1,
                7200);
    }

    @Test
    @DisplayName("공간 목록 조회")
    void findAll() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(service.findAll(ArgumentMatchers.any()))
                .thenReturn(List.of(space()));

        // When & Then
        mvc.perform(MockMvcRequestBuilders.get("/bff/v1/spaces")
                        .cookie(cookie())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "spaces-bff/find-all",
                        cookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("[]").description("공간 목록"),
                                fieldWithPath("[].spaceId").description("공간 ID"),
                                fieldWithPath("[].name").description("공간 이름"),
                                fieldWithPath("[].type").description("공간 유형"),
                                fieldWithPath("[].capacity").description("정원"),
                                fieldWithPath("[].operationalStatus").description("운영 상태"),
                                fieldWithPath("[].inactiveReason").description("비활성 사유"),
                                fieldWithPath("[].cohortId").description("배정 기수 ID"),
                                fieldWithPath("[].status").description("점유 상태"),
                                fieldWithPath("[].occupancyExpiresAt")
                                        .description("점유 만료 시각"),
                                fieldWithPath("[].remainingTimeSeconds")
                                        .description("남은 점유 시간"),
                                fieldWithPath("[].occupiedBySameCohort")
                                        .description("같은 기수 점유 여부"),
                                fieldWithPath("[].occupiedByRequester")
                                        .description("요청자 점유 여부"),
                                fieldWithPath("[].participatingByRequester")
                                        .description("요청자 참여 여부"),
                                fieldWithPath("[].participantCount").description("참여자 수"),
                                fieldWithPath("[].currentPresenceCount")
                                        .description("현재 체류자 수"))));
    }

    @Test
    @DisplayName("실습실 목록 조회")
    void labs() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(service.findSelectableLabs(ArgumentMatchers.any()))
                .thenReturn(List.of(new SelectableLabView(11L, "3기 실습실", 2, 1)));

        // When & Then
        mvc.perform(get("/bff/v1/spaces/labs").cookie(cookie()).session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "spaces-bff/labs",
                        cookies(),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("[]").description("실습실 목록"),
                                fieldWithPath("[].spaceId").description("공간 ID"),
                                fieldWithPath("[].name").description("공간 이름"),
                                fieldWithPath("[].capacity").description("정원"),
                                fieldWithPath("[].reservedCount").description("예약 수"))));
    }

    @Test
    @DisplayName("점유 시작")
    void start() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(service.startOccupancy(ArgumentMatchers.eq(3L), ArgumentMatchers.any()))
                .thenReturn(occ());

        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.post(
                        "/bff/v1/spaces/{spaceId}/occupancies", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isCreated())
                .andDo(document(
                        "spaces-bff/start-occupancy",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID")),
                        PayloadDocumentation.responseFields(occupancy())));
    }

    @Test
    @DisplayName("점유 연장")
    void extend() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(service.extendOccupancy(ArgumentMatchers.eq(3L), ArgumentMatchers.any()))
                .thenReturn(occ());

        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.post(
                        "/bff/v1/spaces/{spaceId}/occupancies/extend", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isOk())
                .andDo(document(
                        "spaces-bff/extend-occupancy",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID")),
                        PayloadDocumentation.responseFields(occupancy())));
    }

    @Test
    @DisplayName("공간 반납")
    void release() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.post(
                        "/bff/v1/spaces/{spaceId}/occupancies/release", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "spaces-bff/release-occupancy",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID"))));
    }

    @Test
    @DisplayName("참여 종료")
    void leave() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.delete(
                        "/bff/v1/spaces/{spaceId}/occupancies/participants/me", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "spaces-bff/leave-occupancy",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID"))));
    }

    @Test
    @DisplayName("참여자 조회")
    void participants() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(service.getParticipants(ArgumentMatchers.eq(3L), ArgumentMatchers.any()))
                .thenReturn(List.of(new OccupancyParticipantView(USER, "사용자", true)));

        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.get(
                        "/bff/v1/spaces/{spaceId}/occupancies/participants", 3)
                .cookie(cookie())
                .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        MockMvcResultMatchers.jsonPath("$[0].displayName").value("사용자"))
                .andDo(document(
                        "spaces-bff/participants",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("[]").description("참여자 목록"),
                                fieldWithPath("[].userId").description("사용자 ID"),
                                fieldWithPath("[].displayName").description("표시 이름"),
                                fieldWithPath("[].occupier").description("점유자 여부"))));
    }

    @Test
    @DisplayName("참여 후보 조회")
    void candidates() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        Mockito.when(
                        service.searchParticipantCandidates(
                                ArgumentMatchers.eq(3L),
                                ArgumentMatchers.eq("사용자"),
                                ArgumentMatchers.any()))
                .thenReturn(
                        List.of(
                                new ParticipantCandidateView(
                                        USER, "사용자", "user@example.com", "AVAILABLE")));

        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.get(
                        "/bff/v1/spaces/{spaceId}/occupancies/participants/candidates",
                        3)
                .param("query", "사용자")
                .cookie(cookie())
                .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        MockMvcResultMatchers.jsonPath("$[0].email").value("user@example.com"))
                .andDo(document(
                        "spaces-bff/candidates",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID")),
                        RequestDocumentation.queryParameters(
                                RequestDocumentation.parameterWithName("query")
                                        .description("후보 검색어")),
                        PayloadDocumentation.responseFields(
                                fieldWithPath("[]").description("후보 목록"),
                                fieldWithPath("[].userId").description("사용자 ID"),
                                fieldWithPath("[].displayName").description("표시 이름"),
                                fieldWithPath("[].email").description("이메일"),
                                fieldWithPath("[].status").description("참여 가능 상태"))));
    }

    @Test
    @DisplayName("참여자 추가")
    void add() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        UUID id = USER;

        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.post(
                        "/bff/v1/spaces/{spaceId}/occupancies/participants", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetUserId\":\"" + id + "\"}"))
                .andExpect(status().isCreated())
                .andDo(document(
                        "spaces-bff/add-participant",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID")),
                        PayloadDocumentation.requestFields(
                                fieldWithPath("targetUserId")
                                        .description("추가할 사용자 ID(UUID)"))));
    }

    @Test
    @DisplayName("참여자 제외")
    void remove() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.delete(
                        "/bff/v1/spaces/{spaceId}/occupancies/participants/{targetUserId}",
                        3,
                        USER)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "spaces-bff/remove-participant",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID"),
                                RequestDocumentation.parameterWithName("targetUserId")
                                        .description("제외할 사용자 ID(UUID)"))));
    }

    @Test
    @DisplayName("공실 알림 신청")
    void vacancy() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mvc.perform(RestDocumentationRequestBuilders.post(
                        "/bff/v1/spaces/{spaceId}/vacancy-alerts", 3)
                .cookie(cookie())
                .session(authenticatedSession())
                .with(csrf()))
                .andExpect(status().isCreated())
                .andDo(document(
                        "spaces-bff/request-vacancy-alert",
                        cookies(),
                        RequestDocumentation.pathParameters(
                                RequestDocumentation.parameterWithName("spaceId")
                                        .description("공간 ID"))));
    }
}
