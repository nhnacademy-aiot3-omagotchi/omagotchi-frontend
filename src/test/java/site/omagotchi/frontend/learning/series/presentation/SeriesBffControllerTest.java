package site.omagotchi.frontend.learning.series.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.learning.series.application.SeriesBffService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SeriesBffControllerTest {

    private SeriesBffService seriesBffService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        seriesBffService = mock(SeriesBffService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new SeriesBffController(seriesBffService))
                .build();
    }

    @Test
    @DisplayName("공간 시계열 경로를 제공하고 서비스 응답을 JSON으로 돌려준다")
    void exposesSpaceSeriesRoute() throws Exception {
        // given
        JsonNode response = JsonMapper.builder().build().createObjectNode()
                .put("location", "study-room-1");
        when(seriesBffService.getSpaceSeries(
                any(HttpServletRequest.class), eq("study-room-1"), eq("co2"), eq("DAY")))
                .thenReturn(response);

        // when & then
        mockMvc.perform(get("/bff/v1/admin/sensors/space-series")
                        .param("location", "study-room-1")
                        .param("measurement", "co2")
                        .param("window", "DAY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location").value("study-room-1"));
    }

    @Test
    @DisplayName("필수 파라미터가 빠지면 400을 돌려준다")
    void rejectsRequestMissingRequiredParams() throws Exception {
        mockMvc.perform(get("/bff/v1/admin/sensors/space-series")
                        .param("location", "study-room-1"))
                .andExpect(status().isBadRequest());
    }
}