package site.omagotchi.frontend.gamification.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest(GamificationBffController.class)
class GamificationBffDocumentationTest extends FrontendRestDocsTestSupport {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LearningProxyBffService proxy;

    @BeforeEach
    void stubLearningPayloads() {
        given(proxy.execute(any(), any()))
                .willAnswer(
                        invocation -> {
                            String path =
                                    ((HttpServletRequest)
                                                    invocation.getArgument(0))
                                            .getRequestURI();
                            if (path.endsWith("/characters")) return characters();
                            if (path.endsWith("/representative")) return representative();
                            if (path.endsWith("/home")) return home();
                            if (path.endsWith("/quests/daily")) return quests();
                            return quest();
                        });
        given(proxy.executeWithCohort(any(), any()))
                .willAnswer(
                        invocation -> {
                            String path =
                                    ((HttpServletRequest)
                                                    invocation.getArgument(0))
                                            .getRequestURI();
                            return path.endsWith("/progression") ? progression() : prediction();
                        });
    }

    @Test
    @DisplayName("캐릭터 목록 조회")
    void getsCharacters() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/gamification/characters").session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$[0].code").value("COMMIT"))
                .andDo(document(
                        "gamification/characters",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("[].gameCharacterId")
                                        .description("게임 캐릭터 ID"),
                                fieldWithPath("[].code").description("게임 캐릭터 코드"),
                                fieldWithPath("[].assetKey").description("캐릭터 asset key"),
                                fieldWithPath("[].name").description("캐릭터 이름"),
                                fieldWithPath("[].description").description("캐릭터 설명"))));
    }

    @Test
    @DisplayName("대표 캐릭터 설정")
    void createsRepresentativeCharacter() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/gamification/characters/representative")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gameCharacterId\":1,\"nickname\":\"오마\",\"colorId\":\"cyan\"}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.representative").value(true))
                .andDo(document(
                        "gamification/representative-character",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        requestFields(
                                fieldWithPath("gameCharacterId")
                                        .description("선택할 게임 캐릭터 ID"),
                                fieldWithPath("nickname").description("캐릭터 닉네임 (2~12자)"),
                                fieldWithPath("colorId").description("캐릭터 색상 ID")),
                        responseFields(userCharacterFields())));
    }

    @Test
    @DisplayName("게이미피케이션 홈 조회")
    void getsHome() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/gamification/home").session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.growth.level").value(3))
                .andDo(document(
                        "gamification/home",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(homeFields())));
    }

    @Test
    @DisplayName("일일 퀘스트 조회")
    void getsDailyQuests() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/gamification/quests/daily").session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$[0].status").value("IN_PROGRESS"))
                .andDo(document(
                        "gamification/daily-quests",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(questFields())));
    }

    @Test
    @DisplayName("일일 퀘스트 보상 수령")
    void claimsUserDailyQuest() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/gamification/quests/{user-daily-quest-id}/claim", 101)
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.status").value("COMPLETED"))
                .andDo(document(
                        "gamification/claim-daily-quest",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("user-daily-quest-id").description("사용자별 일일 Quest 인스턴스 ID")),
                        responseFields(claimFields())));
    }

    @Test
    @DisplayName("학습 진행 조회")
    void getsProgressionWithOptionalDate() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/gamification/progression")
                        .param("aggregationDate", "2026-09-14")
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.studySeconds").value(14400))
                .andDo(document(
                        "gamification/progression",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        queryParameters(parameterWithName("aggregationDate").description("선택적 집계 기준일 (ISO-8601 날짜)")),
                        responseFields(
                                fieldWithPath("aggregationDate").description("집계 기준일"),
                                fieldWithPath("studySeconds").description("집계일 학습 초"),
                                fieldWithPath("reachedFourHours").description("4시간 달성 여부"),
                                fieldWithPath("reachedSixHours").description("6시간 달성 여부"),
                                fieldWithPath("reachedEightHours").description("8시간 달성 여부"),
                                fieldWithPath("currentWeekdayStreakDays")
                                        .description("현재 평일 연속 학습 일수"),
                                fieldWithPath("streakQualified")
                                        .description("연속 학습 조건 충족 여부"))));
    }

    @Test
    @DisplayName("학습 시간 예측 조회")
    void getsStudyTimePrediction() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/gamification/predictions/study-time")
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.predictedStudyHours").value(7.21))
                .andDo(document(
                        "gamification/study-time-prediction",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("predictedStudyHours")
                                        .description("예측 학습 시간(시간)"),
                                fieldWithPath("modelVersion").description("예측 모델 버전"))));
    }

    private static JsonNode characters() {
        return read(
                "[{\"gameCharacterId\":1,\"code\":\"COMMIT\",\"assetKey\":\"commit\",\"name\":\"커밋\",\"description\":\"꾸준함\"}]");
    }

    private static JsonNode representative() {
        return read(
                "{\"userCharacterId\":11,\"gameCharacterId\":1,\"gameCharacterCode\":\"COMMIT\",\"type\":\"BASIC\",\"colorId\":\"cyan\",\"assetKey\":\"commit\",\"gameCharacterName\":\"커밋\",\"nickname\":\"오마\",\"displayName\":\"오마\",\"totalXp\":120,\"level\":3,\"advancementStage\":\"SPROUT\",\"representative\":true}");
    }

    private static JsonNode quest() {
        return read(
                "{\"id\":101,\"questDate\":\"2026-09-14\",\"type\":\"STUDY_TIME\",\"code\":\"STUDY_4H\",\"title\":\"4시간 공부하기\",\"targetCount\":14400,\"progressCount\":14400,\"rewardXp\":100,\"status\":\"COMPLETED\"}");
    }

    private static JsonNode quests() {
        return read(
                "[{\"id\":101,\"questDate\":\"2026-09-14\",\"type\":\"STUDY_TIME\",\"code\":\"STUDY_4H\",\"title\":\"4시간 공부하기\",\"targetCount\":14400,\"progressCount\":3600,\"rewardXp\":100,\"status\":\"IN_PROGRESS\"}]");
    }

    private static JsonNode home() {
        return read(
                "{\"growth\":{\"nickname\":\"오마\",\"displayName\":\"오마\",\"totalXp\":120,\"level\":3,\"currentLevelXp\":20,\"nextLevelRequiredXp\":100,\"advancementStage\":\"SPROUT\"},\"dailyQuests\":[{\"id\":101,\"questDate\":\"2026-09-14\",\"type\":\"STUDY_TIME\",\"code\":\"STUDY_4H\",\"title\":\"4시간 공부하기\",\"targetCount\":14400,\"progressCount\":3600,\"rewardXp\":100,\"status\":\"IN_PROGRESS\"}]}");
    }

    private static JsonNode progression() {
        return read(
                "{\"aggregationDate\":\"2026-09-14\",\"studySeconds\":14400,\"reachedFourHours\":true,\"reachedSixHours\":false,\"reachedEightHours\":false,\"currentWeekdayStreakDays\":2,\"streakQualified\":true}");
    }

    private static JsonNode prediction() {
        return read("{\"predictedStudyHours\":7.21,\"modelVersion\":\"study-time-model\"}");
    }

    private static JsonNode read(String value) {
        try {
            return JSON.readTree(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static FieldDescriptor[] questFields() {
        return new FieldDescriptor[] {
            fieldWithPath("[].id").description("사용자 일일 Quest ID"),
            fieldWithPath("[].questDate").description("퀘스트 날짜"),
            fieldWithPath("[].type").description("퀘스트 유형"),
            fieldWithPath("[].code").description("퀘스트 코드"),
            fieldWithPath("[].title").description("퀘스트 제목"),
            fieldWithPath("[].targetCount").description("목표 수치"),
            fieldWithPath("[].progressCount").description("현재 진행 수치"),
            fieldWithPath("[].rewardXp").description("보상 XP"),
            fieldWithPath("[].status").description("퀘스트 상태")
        };
    }

    private static FieldDescriptor[] claimFields() {
        return new FieldDescriptor[] {
            fieldWithPath("id").description("사용자 일일 Quest ID"),
            fieldWithPath("questDate").description("퀘스트 날짜"),
            fieldWithPath("type").description("퀘스트 유형"),
            fieldWithPath("code").description("퀘스트 코드"),
            fieldWithPath("title").description("퀘스트 제목"),
            fieldWithPath("targetCount").description("목표 수치"),
            fieldWithPath("progressCount").description("현재 진행 수치"),
            fieldWithPath("rewardXp").description("보상 XP"),
            fieldWithPath("status").description("퀘스트 상태")
        };
    }

    private static FieldDescriptor[] userCharacterFields() {
        return new FieldDescriptor[] {
            fieldWithPath("userCharacterId").description("사용자 캐릭터 ID"),
            fieldWithPath("gameCharacterId").description("게임 캐릭터 ID"),
            fieldWithPath("gameCharacterCode").description("게임 캐릭터 코드"),
            fieldWithPath("type").description("캐릭터 유형"),
            fieldWithPath("colorId").description("색상 ID"),
            fieldWithPath("assetKey").description("에셋 키"),
            fieldWithPath("gameCharacterName").description("게임 캐릭터 이름"),
            fieldWithPath("nickname").description("닉네임"),
            fieldWithPath("displayName").description("표시 이름"),
            fieldWithPath("totalXp").description("누적 XP"),
            fieldWithPath("level").description("레벨"),
            fieldWithPath("advancementStage").description("성장 단계"),
            fieldWithPath("representative").description("대표 캐릭터 여부")
        };
    }

    private static FieldDescriptor[] homeFields() {
        return new FieldDescriptor[] {
            fieldWithPath("growth.nickname").description("캐릭터 닉네임"),
            fieldWithPath("growth.displayName").description("캐릭터 표시 이름"),
            fieldWithPath("growth.totalXp").description("누적 XP"),
            fieldWithPath("growth.level").description("레벨"),
            fieldWithPath("growth.currentLevelXp").description("현재 레벨 XP"),
            fieldWithPath("growth.nextLevelRequiredXp").description("다음 레벨 필요 XP"),
            fieldWithPath("growth.advancementStage").description("성장 단계"),
            fieldWithPath("dailyQuests[].id").description("사용자 일일 Quest ID"),
            fieldWithPath("dailyQuests[].questDate").description("퀘스트 날짜"),
            fieldWithPath("dailyQuests[].type").description("퀘스트 유형"),
            fieldWithPath("dailyQuests[].code").description("퀘스트 코드"),
            fieldWithPath("dailyQuests[].title").description("퀘스트 제목"),
            fieldWithPath("dailyQuests[].targetCount").description("목표 수치"),
            fieldWithPath("dailyQuests[].progressCount").description("진행 수치"),
            fieldWithPath("dailyQuests[].rewardXp").description("보상 XP"),
            fieldWithPath("dailyQuests[].status").description("퀘스트 상태")
        };
    }
}
