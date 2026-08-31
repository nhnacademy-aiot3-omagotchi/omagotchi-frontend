package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.application.result.VacancyAlertView;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class VacancyAlertBffControllerTest {

    @Mock
    private SpaceBffService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new VacancyAlertBffController(service)).build();
    }

    @Test
    void getsMine() throws Exception {
        when(service.getMyVacancyAlerts(any(HttpServletRequest.class))).thenReturn(List.of(
                new VacancyAlertView(41L, 3L, 7L,
                        OffsetDateTime.parse("2026-08-27T10:00:00+09:00"))));

        mockMvc.perform(get("/bff/v1/vacancy-alerts/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertId").value(41))
                .andExpect(jsonPath("$[0].spaceId").value(3));
    }

    @Test
    void cancels() throws Exception {
        mockMvc.perform(delete("/bff/v1/vacancy-alerts/41"))
                .andExpect(status().isNoContent());

        verify(service).cancelVacancyAlert(eq(41L), any(HttpServletRequest.class));
    }
}
