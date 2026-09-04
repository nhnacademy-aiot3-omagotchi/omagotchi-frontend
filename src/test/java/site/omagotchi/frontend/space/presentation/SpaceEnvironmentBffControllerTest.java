package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.space.application.SpaceEnvironmentBffService;
import site.omagotchi.frontend.space.application.result.SpaceEnvironmentView;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SpaceEnvironmentBffControllerTest {

    private SpaceEnvironmentBffService spaceEnvironmentBffService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        spaceEnvironmentBffService = mock(SpaceEnvironmentBffService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new SpaceEnvironmentBffController(spaceEnvironmentBffService))
                .build();
    }

    @Test
    @DisplayName("내 기수 공간의 실내 환경을 공간 id와 함께 돌려준다")
    void exposesEnvironmentRoute() throws Exception {
        when(spaceEnvironmentBffService.findMyCohortEnvironments(any(HttpServletRequest.class)))
                .thenReturn(List.of(new SpaceEnvironmentView(
                        101L, 612.4, 23.4, 48.0, Instant.parse("2026-09-03T10:00:00Z"), 2)));

        mockMvc.perform(get("/bff/v1/spaces/environment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spaceId").value(101))
                .andExpect(jsonPath("$[0].co2").value(612.4))
                .andExpect(jsonPath("$[0].temperature").value(23.4))
                .andExpect(jsonPath("$[0].humidity").value(48.0))
                .andExpect(jsonPath("$[0].measuredAt").value("2026-09-03T10:00:00Z"))
                .andExpect(jsonPath("$[0].deviceCount").value(2));
    }

    @Test
    @DisplayName("값이 없는 공간도 목록에 남겨 화면이 측정 대기로 그리게 한다")
    void keepsSpacesWithoutReadings() throws Exception {
        when(spaceEnvironmentBffService.findMyCohortEnvironments(any(HttpServletRequest.class)))
                .thenReturn(List.of(SpaceEnvironmentView.empty(102L)));

        mockMvc.perform(get("/bff/v1/spaces/environment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].spaceId").value(102))
                .andExpect(jsonPath("$[0].co2").doesNotExist())
                .andExpect(jsonPath("$[0].measuredAt").doesNotExist())
                // 센서가 없어서 비었다는 사실은 남는다
                .andExpect(jsonPath("$[0].deviceCount").value(0));
    }
}
