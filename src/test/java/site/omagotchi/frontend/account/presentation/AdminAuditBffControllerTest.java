package site.omagotchi.frontend.account.presentation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.omagotchi.frontend.account.application.AdminAuditBffService;
import site.omagotchi.frontend.account.application.result.IdentityAdminAudit;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;
import site.omagotchi.frontend.global.application.result.PageMetadata;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminAuditBffControllerTest {

    private static final UUID ACTOR_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000000001"
    );
    private static final UUID TARGET_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000000002"
    );

    @Mock
    private AdminAuditBffService service;

    @Mock
    private AccountSessionAuthorization authorization;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        when(authorization.accessToken(any())).thenReturn("admin-token");
        mockMvc = MockMvcBuilders.standaloneSetup(
                new AdminAuditBffController(service, authorization)
        ).build();
    }

    @Test
    @DisplayName("페이지 조건 전달과 감사 응답 변환")
    void forwardsPagingAndReturnsAuditPage() throws Exception {
        // Given: 역할 변경 감사 한 줄
        when(service.findAudits(eq("admin-token"), eq(0), eq(50))).thenReturn(
                new IdentityAdminAuditPage(
                        List.of(new IdentityAdminAudit(
                                "ACCOUNT_ROLE",
                                "ROLE_GRANTED",
                                ACTOR_ID,
                                "시스템 관리자",
                                TARGET_ID,
                                "문재민",
                                "USER",
                                "SYSTEM_ADMIN",
                                "운영 인수인계",
                                Instant.parse("2026-09-02T05:03:00Z")
                        )),
                        new PageMetadata(0, 50, 1, 1)
                )
        );

        // When & Then
        mockMvc.perform(get("/bff/v1/admin/audits").param("page", "0").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].action").value("ROLE_GRANTED"))
                .andExpect(jsonPath("$.items[0].targetName").value("문재민"))
                .andExpect(jsonPath("$.items[0].reason").value("운영 인수인계"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    @DisplayName("페이지 조건 없이 호출하면 Identity 기본값에 맡긴다")
    void passesNullPagingThrough() throws Exception {
        // Given: 화면이 조건을 생략한 호출
        when(service.findAudits(eq("admin-token"), eq(null), eq(null))).thenReturn(
                new IdentityAdminAuditPage(List.of(), new PageMetadata(0, 20, 0, 0))
        );

        // When & Then: BFF 가 임의의 기본값을 만들면 Identity 와 두 벌이 된다
        mockMvc.perform(get("/bff/v1/admin/audits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }
}
