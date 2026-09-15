package site.omagotchi.frontend.account.presentation;

import static org.mockito.Mockito.when;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.restdocs.test.autoconfigure.AutoConfigureRestDocs;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.account.application.AdminAuditBffService;
import site.omagotchi.frontend.account.application.result.IdentityAdminAudit;
import site.omagotchi.frontend.account.application.result.IdentityAdminAuditPage;
import site.omagotchi.frontend.auth.application.result.BrowserSessionTokenBundle;
import site.omagotchi.frontend.auth.domain.GlobalRole;
import site.omagotchi.frontend.global.application.result.PageMetadata;
import site.omagotchi.frontend.support.FrontendMvcTestSupport;

@WebMvcTest(AdminAuditBffController.class)
@AutoConfigureRestDocs(outputDir = "target/generated-snippets")
@Import(AccountSessionAuthorization.class)
class AdminAuditBffControllerTest extends FrontendMvcTestSupport {

    private static final UUID ACTOR_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TARGET_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @MockitoBean
    private AdminAuditBffService service;

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {}

    @Override
    protected MockHttpSession authenticatedSession() {
        Instant now = Instant.parse("2030-01-01T00:00:00Z");
        return authenticatedSession(
                new BrowserSessionTokenBundle(
                        UUID.fromString("00000000-0000-0000-0000-000000000001"),
                        GlobalRole.SYSTEM_ADMIN,
                        "admin-token",
                        now.plusSeconds(3600),
                        "admin-refresh-token",
                        now.plusSeconds(86400)));
    }

    @Test
    @DisplayName("페이지 조건 전달과 감사 응답 변환")
    void forwardsPagingAndReturnsAuditPage() throws Exception {
        // Given: 역할 변경 감사 한 줄
        when(service.findAudits("admin-token", 0, 50)).thenReturn(
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
        mockMvc.perform(get("/bff/v1/admin/audits")
                        .session(authenticatedSession())
                        .param("page", "0")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].action").value("ROLE_GRANTED"))
                .andExpect(jsonPath("$.items[0].targetName").value("문재민"))
                .andExpect(jsonPath("$.items[0].reason").value("운영 인수인계"))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andDo(document(
                        "admin-account/audit-list",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        queryParameters(
                                parameterWithName("page").description("페이지 번호(0부터 시작)"),
                                parameterWithName("size").description("페이지 크기")),
                        responseFields(
                                fieldWithPath("items").description("감사 기록 목록"),
                                fieldWithPath("items[].auditType").description("감사 대상 유형"),
                                fieldWithPath("items[].action").description("감사 작업"),
                                fieldWithPath("items[].actorUserId")
                                        .description("수행자 사용자 ID"),
                                fieldWithPath("items[].actorName")
                                        .description("수행자 이름")
                                        .optional(),
                                fieldWithPath("items[].targetUserId")
                                        .description("대상 사용자 ID"),
                                fieldWithPath("items[].targetName")
                                        .description("대상 사용자 이름")
                                        .optional(),
                                fieldWithPath("items[].beforeValue")
                                        .description("변경 전 값")
                                        .optional(),
                                fieldWithPath("items[].afterValue")
                                        .description("변경 후 값")
                                        .optional(),
                                fieldWithPath("items[].reason")
                                        .description("변경 사유")
                                        .optional(),
                                fieldWithPath("items[].occurredAt").description("발생 시각"),
                                fieldWithPath("page.number").description("현재 페이지 번호"),
                                fieldWithPath("page.size").description("페이지 크기"),
                                fieldWithPath("page.totalElements").description("전체 항목 수"),
                                fieldWithPath("page.totalPages").description("전체 페이지 수"))));
    }

    @Test
    @DisplayName("페이지 조건 없이 호출하면 Identity 기본값에 맡긴다")
    void passesNullPagingThrough() throws Exception {
        // Given: 화면이 조건을 생략한 호출
        when(service.findAudits("admin-token", null, null)).thenReturn(
                new IdentityAdminAuditPage(List.of(), new PageMetadata(0, 20, 0, 0))
        );

        // When & Then: BFF 가 임의의 기본값을 만들면 Identity 와 두 벌이 된다
        mockMvc.perform(get("/bff/v1/admin/audits").session(authenticatedSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andDo(document(
                        "admin-account/audit-list-default",
                        preprocessRequest(prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        responseFields(
                                fieldWithPath("items").description("감사 기록 목록"),
                                fieldWithPath("page.number").description("현재 페이지 번호"),
                                fieldWithPath("page.size").description("페이지 크기"),
                                fieldWithPath("page.totalElements").description("전체 항목 수"),
                                fieldWithPath("page.totalPages").description("전체 페이지 수"))));
    }
}
