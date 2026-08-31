package site.omagotchi.frontend.account.presentation;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.account.application.AdminAccountBffService;
import site.omagotchi.frontend.account.application.result.AdminAccountPage;
import site.omagotchi.frontend.account.application.result.AdminAccountView;
import site.omagotchi.frontend.account.application.result.AdminManagedCohort;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminAccountBffControllerTest {

    @Mock
    private AdminAccountBffService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminAccountBffController(service)).build();
    }

    @Test
    void forwardsSearchConditionsAndReturnsAggregatedPage() throws Exception {
        UUID accountId = UUID.randomUUID();
        when(service.findAccounts(
                any(HttpServletRequest.class),
                org.mockito.ArgumentMatchers.eq("kim"),
                org.mockito.ArgumentMatchers.eq("ACTIVE"),
                org.mockito.ArgumentMatchers.eq("USER"),
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(20),
                org.mockito.ArgumentMatchers.eq("NAME_ASC")
        )).thenReturn(new AdminAccountPage(
                List.of(new AdminAccountView(
                        accountId,
                        "user@example.com",
                        "김사용",
                        "USER",
                        "ACTIVE",
                        (short) 0,
                        null,
                        null,
                        Instant.parse("2026-08-31T07:00:00Z"),
                        List.of(new AdminManagedCohort(3L, "AIoT 3기", "MANAGER"))
                )),
                0,
                20,
                1,
                1
        ));

        mockMvc.perform(get("/bff/v1/admin/users")
                        .param("query", "kim")
                        .param("status", "ACTIVE")
                        .param("role", "USER")
                        .param("page", "0")
                        .param("size", "20")
                        .param("sort", "NAME_ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].accountId").value(accountId.toString()))
                .andExpect(jsonPath("$.content[0].managedCohorts[0].cohortId").value(3))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(service).findAccounts(
                any(HttpServletRequest.class),
                org.mockito.ArgumentMatchers.eq("kim"),
                org.mockito.ArgumentMatchers.eq("ACTIVE"),
                org.mockito.ArgumentMatchers.eq("USER"),
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.eq(20),
                org.mockito.ArgumentMatchers.eq("NAME_ASC"));
    }

    @Test
    void assignsAndRemovesManagedCohort() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(put("/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}",
                        userId, 3L))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/bff/v1/admin/users/{user-id}/managed-cohorts/{cohort-id}",
                        userId, 3L))
                .andExpect(status().isOk());

        verify(service).assignManager(any(HttpServletRequest.class),
                org.mockito.ArgumentMatchers.eq(userId), org.mockito.ArgumentMatchers.eq(3L));
        verify(service).removeManager(any(HttpServletRequest.class),
                org.mockito.ArgumentMatchers.eq(userId), org.mockito.ArgumentMatchers.eq(3L));
    }
}
