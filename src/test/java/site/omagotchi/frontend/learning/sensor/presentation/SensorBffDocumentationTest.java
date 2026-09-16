package site.omagotchi.frontend.learning.sensor.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.put;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static site.omagotchi.frontend.support.RestDocs.document;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.learning.sensor.application.SensorAdminBffService;
import site.omagotchi.frontend.learning.series.application.SeriesBffService;
import site.omagotchi.frontend.learning.series.presentation.SeriesBffController;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({SensorAdminBffController.class, SeriesBffController.class})
class SensorBffDocumentationTest extends FrontendRestDocsTestSupport {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SensorAdminBffService service;

    @MockitoBean
    private SeriesBffService seriesService;

    void setup() {
        given(seriesService.getSpaceSeries(any(), any(), any(), any()))
                .willReturn(
                        read(
                                "{\"location\":\"study-room-1\",\"measurement\":\"co2\",\"window\":\"DAY\",\"interval\":\"1h\",\"from\":\"2026-09-13T00:00:00Z\",\"to\":\"2026-09-14T00:00:00Z\",\"serverTime\":\"2026-09-14T00:00:00Z\",\"sources\":{\"settled\":\"AVG_1H\",\"hot\":\"RAW\"},\"sensorCount\":1,\"sensors\":[],\"points\":[]}"));
        given(service.getSpaces(any())).willReturn(read("[{\"spaceId\":7,\"name\":\"스터디룸\"}]"));
        given(service.getDevices(any()))
                .willReturn(
                        read(
                                "[{\"deviceEui\":\"24e124136d151547\",\"spaceId\":7,\"displayName\":\"CO2 센서\",\"model\":\"SCD40\",\"installationPoint\":\"창가\",\"expectedIntervalSeconds\":60,\"active\":true}]"));
        given(service.createDevice(any(), any()))
                .willReturn(read("{\"deviceEui\":\"24e124136d151547\"}"));
        given(service.claimDevice(any(), any(), any()))
                .willReturn(
                        read(
                                "{\"deviceEui\":\"24e124136d151547\",\"spaceId\":7,\"displayName\":\"CO2 센서\",\"model\":\"SCD40\",\"installationPoint\":\"창가\",\"expectedIntervalSeconds\":60,\"active\":true}"));
        given(service.updateDevice(any(), any(), any()))
                .willReturn(
                        read(
                                "{\"deviceEui\":\"24e124136d151547\",\"spaceId\":7,\"displayName\":\"CO2 센서\",\"model\":\"SCD40\",\"installationPoint\":\"창가\",\"expectedIntervalSeconds\":60,\"active\":true}"));
        given(service.updateDeviceActive(any(), any(), any()))
                .willReturn(
                        read(
                                "{\"deviceEui\":\"24e124136d151547\",\"spaceId\":7,\"displayName\":\"CO2 센서\",\"model\":\"SCD40\",\"installationPoint\":\"창가\",\"expectedIntervalSeconds\":60,\"active\":false}"));
        given(service.getEvents(any(), any(), any(), any(), any(), any(), any()))
                .willReturn(read("{\"content\":[],\"page\":1,\"size\":8,\"totalElements\":13,\"totalPages\":2}"));
        given(service.getSpaceThresholds(any()))
                .willReturn(
                        read(
                                "[{\"spaceId\":7,\"deviceCount\":1,\"metrics\":[{\"metric\":\"co2\",\"operator\":\"GTE\",\"threshold\":1000.0,\"ruleCount\":1,\"mixed\":false}]}]"));
        given(service.applySpaceThreshold(any(), any(), any()))
                .willReturn(
                        read(
                                "{\"spaceId\":7,\"deviceCount\":1,\"created\":1,\"applied\":0,\"unchanged\":0,\"missing\":0}"));
    }

    @Test
    @DisplayName("공간 목록 조회")
    void spaces() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/sensors/spaces").session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$[0].spaceId").value(7))
                .andDo(document(
                        "sensors/spaces",
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("[].spaceId").description("공간 ID"),
                                fieldWithPath("[].name").description("공간 이름"))));
    }

    @Test
    @DisplayName("센서 목록 조회")
    void devices() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/sensors/devices").session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$[0].deviceEui").value("24e124136d151547"))
                .andDo(document(
                        "sensors/devices",
                        preprocessResponse(prettyPrint()),
                        responseFields(deviceFields("[]"))));
    }

    @Test
    @DisplayName("센서 등록")
    void create() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(post("/bff/v1/admin/sensors/devices")
                        .contentType("application/json")
                        .content(
                                "{\"deviceEui\":\"24e124136d151547\",\"spaceId\":7,\"displayName\":\"CO2 센서\",\"model\":\"SCD40\",\"installationPoint\":\"창가\",\"expectedIntervalSeconds\":60}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.deviceEui").exists())
                .andDo(document(
                        "sensors/create-device",
                        requestFields(
                                fieldWithPath("deviceEui").description("센서 EUI"),
                                fieldWithPath("spaceId").description("공간 ID"),
                                fieldWithPath("displayName").description("표시 이름"),
                                fieldWithPath("model").description("모델"),
                                fieldWithPath("installationPoint").description("설치 위치"),
                                fieldWithPath("expectedIntervalSeconds")
                                        .description("예상 수집 주기(초)")),
                        responseFields(fieldWithPath("deviceEui").description("생성된 센서 EUI"))));
    }

    @Test
    @DisplayName("센서 공간 배정")
    void claim() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(post("/bff/v1/admin/sensors/devices/{device-eui}/claim", "24e124136d151547")
                        .contentType("application/json")
                        .content("{\"spaceId\":7}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.active").value(true))
                .andDo(document(
                        "sensors/claim-device",
                        pathParameters(parameterWithName("device-eui").description("센서 EUI")),
                        responseFields(deviceFields(""))));
    }

    @Test
    @DisplayName("센서 정보 수정")
    void update() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(put("/bff/v1/admin/sensors/devices/{device-eui}", "24e124136d151547")
                        .contentType("application/json")
                        .content("{\"displayName\":\"CO2 센서\"}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "sensors/update-device",
                        pathParameters(parameterWithName("device-eui").description("센서 EUI")),
                        responseFields(deviceFields(""))));
    }

    @Test
    @DisplayName("센서 활성 상태 수정")
    void active() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(patch(
                                "/bff/v1/admin/sensors/devices/{device-eui}/active",
                                "24e124136d151547")
                        .contentType("application/json")
                        .content("{\"active\":false}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andDo(document(
                        "sensors/update-active",
                        pathParameters(parameterWithName("device-eui").description("센서 EUI")),
                        responseFields(deviceFields(""))));
    }

    @Test
    @DisplayName("센서 이벤트 조회")
    void events() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/sensors/events")
                        .param("type", "RULE_HIT")
                        .param("page", "1")
                        .param("size", "8")
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.totalPages").value(2))
                .andDo(document(
                        "sensors/events",
                        queryParameters(
                                parameterWithName("type").description("이벤트 유형"),
                                parameterWithName("deviceEui")
                                        .description("센서 EUI")
                                        .optional(),
                                parameterWithName("from").description("시작 시각").optional(),
                                parameterWithName("to").description("종료 시각").optional(),
                                parameterWithName("page").description("페이지"),
                                parameterWithName("size").description("크기")),
                        responseFields(
                                fieldWithPath("content").description("이벤트 목록"),
                                fieldWithPath("page").description("페이지"),
                                fieldWithPath("size").description("크기"),
                                fieldWithPath("totalElements").description("전체 건수"),
                                fieldWithPath("totalPages").description("전체 페이지 수"))));
    }

    @Test
    @DisplayName("공간 임계값 조회")
    void thresholds() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/sensors/thresholds").session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$[0].spaceId").value(7),
                        jsonPath("$[0].metrics[0].metric").value("co2"))
                .andDo(document("sensors/thresholds", responseFields(thresholdFields())));
    }

    @Test
    @DisplayName("공간 임계값 적용")
    void applyThreshold() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(patch("/bff/v1/admin/sensors/thresholds/{space-id}", 7)
                        .contentType("application/json")
                        .content("{\"rules\":[]}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.spaceId").value(7),
                        jsonPath("$.created").value(1))
                .andDo(document(
                        "sensors/apply-threshold",
                        pathParameters(parameterWithName("space-id").description("공간 ID")),
                        responseFields(
                                fieldWithPath("spaceId").description("공간 ID"),
                                fieldWithPath("deviceCount").description("대상 기기 수"),
                                fieldWithPath("created").description("새로 생성된 룰 수"),
                                fieldWithPath("applied").description("변경 적용된 룰 수"),
                                fieldWithPath("unchanged").description("변경되지 않은 룰 수"),
                                fieldWithPath("missing").description("누락된 룰 수"))));
    }

    @Test
    @DisplayName("공간 시계열 조회")
    void series() throws Exception {
        // Given: 인증 세션과 실제 응답 fixture
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/sensors/space-series")
                        .param("location", "study-room-1")
                        .param("measurement", "co2")
                        .param("window", "DAY")
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        jsonPath("$.location").value("study-room-1"),
                        jsonPath("$.sensors[0].point").value("co2"),
                        jsonPath("$.points[0].avg").value(650.0))
                .andDo(document(
                        "sensors/space-series",
                        queryParameters(
                                parameterWithName("location").description("공간 위치"),
                                parameterWithName("measurement").description("측정 항목"),
                                parameterWithName("window").description("조회 구간")),
                        responseFields(
                                fieldWithPath("location").description("공간 위치"),
                                fieldWithPath("measurement").description("측정 항목"),
                                fieldWithPath("window").description("조회 구간"),
                                fieldWithPath("interval").description("집계 간격"),
                                fieldWithPath("from").description("시작 시각"),
                                fieldWithPath("to").description("종료 시각"),
                                fieldWithPath("serverTime").description("서버 시각"),
                                fieldWithPath("sources").description("데이터 버킷 출처"),
                                fieldWithPath("sources.settled").description("확정 버킷"),
                                fieldWithPath("sources.hot").description("진행 버킷"),
                                fieldWithPath("sensorCount").description("센서 수"),
                                fieldWithPath("sensors").description("센서 목록"),
                                fieldWithPath("sensors[].deviceEui").description("센서 EUI"),
                                fieldWithPath("sensors[].point").description("측정 point"),
                                fieldWithPath("sensors[].displayName")
                                        .description("센서 표시 이름"),
                                fieldWithPath("points").description("시계열 점 목록"),
                                fieldWithPath("points[].time").description("측정 시각"),
                                fieldWithPath("points[].avg").description("평균값"),
                                fieldWithPath("points[].min").description("최솟값"),
                                fieldWithPath("points[].minDeviceEui")
                                        .description("최솟값 센서 EUI"),
                                fieldWithPath("points[].max").description("최댓값"),
                                fieldWithPath("points[].maxDeviceEui")
                                        .description("최댓값 센서 EUI"),
                                fieldWithPath("points[].count").description("측정 개수"),
                                fieldWithPath("points[].partial")
                                        .description("부분 집계 여부"))));
    }

    void nonEmptySeriesFixture() {
        given(seriesService.getSpaceSeries(any(), any(), any(), any()))
                .willReturn(
                        read(
                                "{\"location\":\"study-room-1\",\"measurement\":\"co2\",\"window\":\"DAY\",\"interval\":\"1h\",\"from\":\"2026-09-13T00:00:00Z\",\"to\":\"2026-09-14T00:00:00Z\",\"serverTime\":\"2026-09-14T00:00:00Z\",\"sources\":{\"settled\":\"AVG_1H\",\"hot\":\"RAW\"},\"sensorCount\":1,\"sensors\":[{\"deviceEui\":\"24e124136d151547\",\"point\":\"co2\",\"displayName\":\"CO2 센서\"}],\"points\":[{\"time\":\"2026-09-14T00:00:00Z\",\"avg\":650.0,\"min\":640.0,\"minDeviceEui\":\"24e124136d151547\",\"max\":660.0,\"maxDeviceEui\":\"24e124136d151547\",\"count\":1,\"partial\":false}]}"));
    }

    @BeforeEach
    void runSetup() {
        setup();
        nonEmptySeriesFixture();
    }

    private static JsonNode read(String s) {
        try {
            return JSON.readTree(s);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static FieldDescriptor[] deviceFields(String p) {
        String q = p.isEmpty() ? "" : p + ".";
        return new FieldDescriptor[] {
            fieldWithPath(q + "deviceEui").description("센서 EUI"),
            fieldWithPath(q + "spaceId").description("공간 ID"),
            fieldWithPath(q + "displayName").description("표시 이름"),
            fieldWithPath(q + "model").description("모델"),
            fieldWithPath(q + "installationPoint").description("설치 위치"),
            fieldWithPath(q + "expectedIntervalSeconds").description("수집 주기(초)"),
            fieldWithPath(q + "active").description("활성 여부")
        };
    }

    private static FieldDescriptor[] thresholdFields() {
        return new FieldDescriptor[] {
            fieldWithPath("[].spaceId").description("공간 ID"),
            fieldWithPath("[].deviceCount").description("대상 기기 수"),
            fieldWithPath("[].metrics").description("측정 항목별 임계치"),
            fieldWithPath("[].metrics[].metric").description("측정 항목"),
            fieldWithPath("[].metrics[].operator").description("비교 연산자"),
            fieldWithPath("[].metrics[].threshold").description("임계치"),
            fieldWithPath("[].metrics[].ruleCount").description("해당 항목 룰 수"),
            fieldWithPath("[].metrics[].mixed").description("기기별 설정 혼합 여부")
        };
    }
}
