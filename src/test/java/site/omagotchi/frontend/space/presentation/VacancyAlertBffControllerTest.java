package site.omagotchi.frontend.space.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.application.result.VacancyAlertView;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;

@WebMvcTest(VacancyAlertBffController.class)
class VacancyAlertBffControllerTest extends FrontendMvcTestSupport {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SpaceBffService service;

    @Test
    void getsMine() throws Exception {
        when(service.getMyVacancyAlerts(any(HttpServletRequest.class))).thenReturn(List.of(
                new VacancyAlertView(41L, 3L, 7L,
                        OffsetDateTime.parse("2026-08-27T10:00:00+09:00"))));

        mockMvc.perform(get("/bff/v1/vacancy-alerts/me").session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertId").value(41))
                .andExpect(jsonPath("$[0].spaceId").value(3));
    }

    @Test
    void cancels() throws Exception {
        mockMvc.perform(delete("/bff/v1/vacancy-alerts/41")
                        .session(authenticatedSession())
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(service).cancelVacancyAlert(eq(41L), any(HttpServletRequest.class));
    }
}
