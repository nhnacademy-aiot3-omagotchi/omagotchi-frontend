package site.omagotchi.frontend.profile.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import site.omagotchi.frontend.profile.application.ProfileBffService;
import site.omagotchi.frontend.profile.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.profile.infrastructure.response.ApprovedCohortResponse;
import site.omagotchi.frontend.profile.infrastructure.response.CurrentCharacterResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.profile.infrastructure.response.UserProfileResponse;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;

@WebMvcTest(ProfileBffController.class)
class ProfileBffDocumentationTest extends FrontendRestDocsTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfileBffService profileBffService;

    @Test
    @DisplayName("내 프로필 조회")
    void documentsMyProfile() throws Exception {
        // Given: 인증 세션과 프로필 응답
        MockHttpSession session = authenticatedSession();
        UserProfileResponse profile = profile();
        given(profileBffService.getMyProfile(any(HttpServletRequest.class))).willReturn(profile);

        // When & Then
        mockMvc.perform(authenticated(get("/bff/v1/me/profile"), session))
                .andExpect(status().isOk())
                .andDo(document(
                        "profile/get-my-profile",
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("userId").description("현재 인증된 사용자 ID"),
                                fieldWithPath("nickname").description("사용자 닉네임"),
                                fieldWithPath("totalStudySeconds")
                                        .description("누적 학습 시간(초)"),
                                fieldWithPath("completedSessionCount")
                                        .description("완료한 학습 세션 수"),
                                fieldWithPath("attendanceStreakDays")
                                        .description("연속 출석 일수"),
                                fieldWithPath("approvedCohort").description("승인된 기수 정보"),
                                fieldWithPath("approvedCohort.cohortId")
                                        .description("기수 ID"),
                                fieldWithPath("approvedCohort.name").description("기수 이름"),
                                fieldWithPath("approvedCohort.startDate")
                                        .description("기수 시작일"),
                                fieldWithPath("approvedCohort.endDate")
                                        .description("기수 종료일"),
                                fieldWithPath("approvedCohort.cohortStatus")
                                        .description("기수 상태"),
                                fieldWithPath("approvedCohort.role").description("기수 내 역할"),
                                fieldWithPath("approvedCohort.membershipStatus")
                                        .description("멤버십 상태"),
                                fieldWithPath("currentCharacter").description("대표 캐릭터 정보"),
                                fieldWithPath("currentCharacter.nickname")
                                        .description("캐릭터 닉네임"),
                                fieldWithPath("currentCharacter.level")
                                        .description("캐릭터 레벨"),
                                fieldWithPath("currentCharacter.currentExp")
                                        .description("현재 경험치"),
                                fieldWithPath("currentCharacter.requiredExp")
                                        .description("다음 레벨 필요 경험치"),
                                fieldWithPath("currentCharacter.name")
                                        .description("캐릭터 이름"),
                                fieldWithPath("currentCharacter.type")
                                        .description("캐릭터 타입"),
                                fieldWithPath("currentCharacter.colorId")
                                        .description("캐릭터 색상 ID"),
                                fieldWithPath("currentCharacter.assetKey")
                                        .description("캐릭터 asset key"))));

        verify(profileBffService).getMyProfile(any(HttpServletRequest.class));
    }

    @Test
    @DisplayName("닉네임 변경")
    void documentsNicknameUpdate() throws Exception {
        // Given: 인증 세션과 변경할 닉네임
        MockHttpSession session = authenticatedSession();
        UpdateNicknameRequest request = new UpdateNicknameRequest("오마고치");
        UserNicknameResponse response = new UserNicknameResponse("오마고치");
        given(
                        profileBffService.updateMyNickname(
                                any(HttpServletRequest.class), any(UpdateNicknameRequest.class)))
                .willReturn(response);

        // When & Then
        mockMvc.perform(authenticated(
                        patch("/bff/v1/me/nickname")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"nickname\":\"오마고치\"}"),
                        session))
                .andExpect(status().isOk())
                .andDo(document(
                        "profile/update-nickname",
                        preprocessResponse(prettyPrint()),
                        requestFields(fieldWithPath("nickname").description("변경할 닉네임(한글·영문·숫자, 2~12자)")),
                        responseFields(fieldWithPath("nickname").description("변경된 닉네임"))));

        verify(profileBffService)
                .updateMyNickname(any(HttpServletRequest.class), any(UpdateNicknameRequest.class));
    }

    private MockHttpServletRequestBuilder authenticated(
            MockHttpServletRequestBuilder request, MockHttpSession session) {
        return request.session(session);
    }

    private UserProfileResponse profile() {
        return new UserProfileResponse(
                "user-0001",
                "오마고치",
                36000,
                12,
                5,
                new ApprovedCohortResponse(
                        1L,
                        "Spring Boot 1기",
                        LocalDate.of(2026, 8, 1),
                        LocalDate.of(2026, 12, 31),
                        "ACTIVE",
                        "MEMBER",
                        "APPROVED"),
                new CurrentCharacterResponse(
                        "오마고치", 3, 240, 500, "밤의 오마", "night", "pistachio", "night/pistachio"));
    }
}
