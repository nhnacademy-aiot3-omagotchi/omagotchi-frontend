package site.omagotchi.frontend.space.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.restdocs.cookies.CookieDocumentation.requestCookies;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockCookie;
import org.springframework.restdocs.cookies.CookieDocumentation;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.application.SpaceEnvironmentBffService;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;
import site.omagotchi.frontend.space.application.result.VacancyAlertView;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest({SpaceEnvironmentBffController.class, VacancyAlertBffController.class})
class FrontendEnvironmentAlertsDocumentationTest extends FrontendRestDocsTestSupport {

    @MockitoBean
    private SpaceEnvironmentBffService environmentService;

    @MockitoBean
    private SpaceBffService vacancyService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("공간 환경 조회")
    void readsMyCohortEnvironment() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        given(environmentService.findMyCohortEnvironments(any(HttpServletRequest.class)))
                .willReturn(
                        List.of(
                                new SpaceEnvironmentView(
                                        101L,
                                        612.4,
                                        23.4,
                                        48.0,
                                        Instant.parse("2026-09-03T10:00:00Z"),
                                        2)));

        // When & Then
        mockMvc.perform(get("/bff/v1/spaces/environment")
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "environment-alerts/get-space-environment",
                        requestCookies(
                                CookieDocumentation.cookieWithName("SESSION")
                                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                        responseFields(
                                fieldWithPath("[].spaceId")
                                        .type(JsonFieldType.NUMBER)
                                        .description("공간 ID"),
                                fieldWithPath("[].co2")
                                        .type(JsonFieldType.NUMBER)
                                        .optional()
                                        .description("CO2 측정값"),
                                fieldWithPath("[].temperature")
                                        .type(JsonFieldType.NUMBER)
                                        .optional()
                                        .description("온도"),
                                fieldWithPath("[].humidity")
                                        .type(JsonFieldType.NUMBER)
                                        .optional()
                                        .description("습도"),
                                fieldWithPath("[].measuredAt")
                                        .type(JsonFieldType.STRING)
                                        .optional()
                                        .description("측정 시각"),
                                fieldWithPath("[].deviceCount")
                                        .type(JsonFieldType.NUMBER)
                                        .description("센서 장치 수"))));
    }

    @Test
    @DisplayName("공실 알림 목록 조회")
    void listsMyVacancyAlerts() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        given(vacancyService.getMyVacancyAlerts(any(HttpServletRequest.class)))
                .willReturn(
                        List.of(
                                new VacancyAlertView(
                                        41L,
                                        3L,
                                        7L,
                                        OffsetDateTime.parse("2026-08-27T10:00:00+09:00"))));

        // When & Then
        mockMvc.perform(get("/bff/v1/vacancy-alerts/me")
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "environment-alerts/get-vacancy-alerts",
                        requestCookies(
                                CookieDocumentation.cookieWithName("SESSION")
                                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                        responseFields(
                                fieldWithPath("[].alertId")
                                        .type(JsonFieldType.NUMBER)
                                        .description("알림 신청 ID"),
                                fieldWithPath("[].spaceId")
                                        .type(JsonFieldType.NUMBER)
                                        .description("공간 ID"),
                                fieldWithPath("[].cohortId")
                                        .type(JsonFieldType.NUMBER)
                                        .description("기수 ID"),
                                fieldWithPath("[].createdAt")
                                        .type(JsonFieldType.STRING)
                                        .description("신청 시각"))));
    }

    @Test
    @DisplayName("공실 알림 취소")
    void cancelsVacancyAlert() throws Exception {
        // Given: 인증 세션과 서비스 응답 준비
        // When & Then
        mockMvc.perform(delete("/bff/v1/vacancy-alerts/{alertId}", 41L)
                        .cookie(new MockCookie("SESSION", "[SESSION_ID]"))
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "environment-alerts/cancel-vacancy-alert",
                        requestCookies(
                                CookieDocumentation.cookieWithName("SESSION")
                                        .description("브라우저 세션 식별자입니다. 문서에는 `[SESSION_ID]`로 표시합니다.")),
                        pathParameters(parameterWithName("alertId").description("취소할 알림 신청 ID"))));
    }
}
