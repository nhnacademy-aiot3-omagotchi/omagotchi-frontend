package site.omagotchi.frontend.learning.series.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.learning.series.application.SeriesBffService;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest(SeriesBffController.class)
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
class SeriesBffControllerTest extends FrontendMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SeriesBffService seriesBffService;

    @Test
    @DisplayName("공간 시계열 경로를 제공하고 서비스 응답을 JSON으로 돌려준다")
    void exposesSpaceSeriesRoute() throws Exception {
        JsonNode response = JsonMapper.builder().build().createObjectNode()
                .put("location", "study-room-1");
        given(
                        seriesBffService.getSpaceSeries(
                                any(HttpServletRequest.class),
                                eq("study-room-1"),
                                eq("co2"),
                                eq("DAY")))
                .willReturn(response);

        mockMvc.perform(get("/bff/v1/admin/sensors/space-series")
                        .param("location", "study-room-1")
                        .param("measurement", "co2")
                        .param("window", "DAY")
                        .session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location").value("study-room-1"));
    }

    @Test
    @DisplayName("필수 파라미터가 빠지면 400을 돌려준다")
    void rejectsRequestMissingRequiredParams() throws Exception {
        mockMvc.perform(get("/bff/v1/admin/sensors/space-series")
                        .param("location", "study-room-1")
                        .session(authenticatedSession()))
                .andExpect(status().isBadRequest());
    }
}
