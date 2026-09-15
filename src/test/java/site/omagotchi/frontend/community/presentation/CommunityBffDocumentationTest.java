package site.omagotchi.frontend.community.presentation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.headers.HeaderDocumentation.responseHeaders;
import static org.springframework.restdocs.mockmvc.MockMvcRestDocumentation.document;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.delete;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.get;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.multipart;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.patch;
import static org.springframework.restdocs.mockmvc.RestDocumentationRequestBuilders.post;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.requestPartFields;
import static org.springframework.restdocs.payload.PayloadDocumentation.responseFields;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.restdocs.request.RequestDocumentation.partWithName;
import static org.springframework.restdocs.request.RequestDocumentation.pathParameters;
import static org.springframework.restdocs.request.RequestDocumentation.queryParameters;
import static org.springframework.restdocs.request.RequestDocumentation.requestParts;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.request.ParameterDescriptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;
import site.omagotchi.frontend.support.FrontendRestDocsTestSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({CommunityBffController.class, AdminCommunityBffController.class})
class CommunityBffDocumentationTest extends FrontendRestDocsTestSupport {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LearningProxyBffService proxy;

    @BeforeEach
    void stubs() {
        given(proxy.executeWithCohort(any(), any())).willAnswer(i -> payload(i.getArgument(0)));
        given(proxy.execute(any(), any())).willAnswer(i -> adminPayload(i.getArgument(0)));
    }

    @Test
    @DisplayName("게시글 목록 조회")
    void listPosts() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/community/posts")
                        .param("page", "0")
                        .param("size", "20")
                        .param("type", "NOTICE")
                        .param("search", "학습")
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.items[0].postId").value(1))
                .andDo(document(
                        "community/list-posts",
                        preprocessResponse(prettyPrint()),
                        queryParameters(
                                parameterWithName("page").description("페이지"),
                                parameterWithName("size").description("페이지 크기"),
                                parameterWithName("type").description("게시글 유형").optional(),
                                parameterWithName("search").description("검색어").optional()),
                        responseFields(listFields())));
    }

    @Test
    @DisplayName("게시글 상세 조회")
    void getPost() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/community/posts/{post-id}", 1).session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/get-post",
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("post-id").description("게시글 ID")),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("첨부파일 다운로드")
    void download() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/community/posts/{post-id}/attachments/{attachment-id}", 1, 9)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        content().bytes(new byte[] {1, 2, 3}),
                        content().contentType(MediaType.IMAGE_PNG),
                        header().string("Content-Disposition", "attachment; filename=note.txt"))
                .andDo(document(
                        "community/download-attachment",
                        pathParameters(postAttachment()),
                        responseHeaders(
                                headerWithName("Content-Type").description("파일 MIME type"),
                                headerWithName("Content-Disposition")
                                        .description("다운로드 파일명"))));
    }

    @Test
    @DisplayName("첨부파일 미리보기")
    void thumbnail() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get(
                                "/bff/v1/community/posts/{post-id}/attachments/{attachment-id}/thumbnail",
                                1,
                                9)
                        .session(authenticatedSession()))
                .andExpectAll(
                        status().isOk(),
                        content().bytes(new byte[] {1, 2, 3}),
                        content().contentType(MediaType.IMAGE_PNG),
                        header().string("Content-Disposition", "attachment; filename=note.txt"))
                .andDo(document(
                        "community/preview-attachment",
                        pathParameters(postAttachment()),
                        responseHeaders(
                                headerWithName("Content-Type").description("파일 MIME type"),
                                headerWithName("Content-Disposition")
                                        .description("미리보기 파일명"))));
    }

    @Test
    @DisplayName("첨부파일 삭제")
    void deleteAttachment() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(delete(
                                "/bff/v1/community/posts/{post-id}/attachments/{attachment-id}",
                                1,
                                9)
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isNoContent())
                .andDo(document("community/delete-attachment", pathParameters(postAttachment())));
    }

    @Test
    @DisplayName("게시글 생성")
    void createJson() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/community/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"QUESTION\",\"title\":\"질문\",\"content\":\"내용\"}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/create-post",
                        preprocessResponse(prettyPrint()),
                        requestFields(postRequest()),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("첨부파일 포함 게시글 생성")
    void createMultipart() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(multipart("/bff/v1/community/posts")
                        .file(
                                new MockMultipartFile(
                                        "post",
                                        "",
                                        MediaType.APPLICATION_JSON_VALUE,
                                        "{\"type\":\"QUESTION\",\"title\":\"질문\",\"content\":\"내용\"}"
                                                .getBytes()))
                        .file(
                                new MockMultipartFile(
                                        "attachments",
                                        "note.txt",
                                        MediaType.TEXT_PLAIN_VALUE,
                                        new byte[] {1, 2}))
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/create-post-multipart",
                        preprocessResponse(prettyPrint()),
                        requestParts(
                                partWithName("post").description("게시글 JSON"),
                                partWithName("attachments").description("첨부파일").optional()),
                        requestPartFields("post", postRequest()),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("게시글 수정")
    void updateJson() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(patch("/bff/v1/community/posts/{post-id}", 1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"수정\",\"content\":\"변경 내용\"}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/update-post",
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("post-id").description("게시글 ID")),
                        requestFields(updateRequest()),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("첨부파일 포함 게시글 수정")
    void updateMultipart() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(multipart("/bff/v1/community/posts/{post-id}", 1)
                        .file(
                                new MockMultipartFile(
                                        "post",
                                        "",
                                        MediaType.APPLICATION_JSON_VALUE,
                                        "{\"title\":\"수정\",\"content\":\"변경 내용\"}"
                                                .getBytes()))
                        .file(
                                new MockMultipartFile(
                                        "attachments",
                                        "note.txt",
                                        MediaType.TEXT_PLAIN_VALUE,
                                        new byte[] {1, 2}))
                        .with(
                                r -> {
                                    r.setMethod("PATCH");
                                    return r;
                                })
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/update-post-multipart",
                        preprocessResponse(prettyPrint()),
                        pathParameters(parameterWithName("post-id").description("게시글 ID")),
                        requestParts(
                                partWithName("post").description("게시글 JSON"),
                                partWithName("attachments").description("첨부파일").optional()),
                        requestPartFields("post", updateRequest()),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("게시글 삭제")
    void deletePost() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(delete("/bff/v1/community/posts/{post-id}", 1)
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpect(status().isNoContent())
                .andDo(document(
                        "community/delete-post",
                        pathParameters(parameterWithName("post-id").description("게시글 ID"))));
    }

    @Test
    @DisplayName("관리자 게시글 목록 조회")
    void adminList() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(get("/bff/v1/admin/cohorts/{cohort-id}/community/posts", 7)
                        .param("page", "0")
                        .param("size", "20")
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.items[0].postId").value(1))
                .andDo(document(
                        "community/admin-list-posts",
                        pathParameters(parameterWithName("cohort-id").description("기수 ID")),
                        queryParameters(
                                parameterWithName("page").description("페이지"),
                                parameterWithName("size").description("페이지 크기"),
                                parameterWithName("type").description("유형").optional(),
                                parameterWithName("search").description("검색어").optional()),
                        responseFields(listFields())));
    }

    @Test
    @DisplayName("관리자 게시글 생성")
    void adminCreate() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(post("/bff/v1/admin/cohorts/{cohort-id}/community/posts", 7)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NOTICE\",\"title\":\"공지\",\"content\":\"내용\"}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/admin-create-post",
                        pathParameters(parameterWithName("cohort-id").description("기수 ID")),
                        requestFields(postRequest()),
                        responseFields(detailFields())));
    }

    @Test
    @DisplayName("관리자 게시글 고정 변경")
    void adminPin() throws Exception {
        // Given: 인증 세션과 테스트 하류 응답을 준비한다.
        // When & Then
        mockMvc.perform(patch(
                                "/bff/v1/admin/cohorts/{cohort-id}/community/posts/{post-id}/pin",
                                7,
                                1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pinned\":true}")
                        .with(csrf())
                        .session(authenticatedSession()))
                .andExpectAll(status().isOk(), jsonPath("$.postId").value(1))
                .andDo(document(
                        "community/admin-pin-post",
                        pathParameters(
                                parameterWithName("cohort-id").description("기수 ID"),
                                parameterWithName("post-id").description("게시글 ID")),
                        requestFields(fieldWithPath("pinned").description("고정 여부")),
                        responseFields(detailFields())));
    }

    private static Object payload(HttpServletRequest r) {
        if (r.getRequestURI().contains("attachments/")) {
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.IMAGE_PNG);
            h.set("Content-Disposition", "attachment; filename=note.txt");
            return new ResponseEntity<>(
                    new ByteArrayResource(new byte[] {1, 2, 3}),
                    h,
                    HttpStatus.OK);
        }
        if (r.getMethod().equals("GET") && r.getRequestURI().endsWith("/posts"))
            return read(
                    "{\"items\":[{\"postId\":1,\"type\":\"QUESTION\",\"title\":\"질문\",\"authorUserId\":\"u\",\"authorNickname\":\"오마\",\"cohortId\":7,\"pinned\":false,\"createdAt\":\"2026-09-14T00:00:00Z\",\"updatedAt\":\"2026-09-14T00:00:00Z\",\"attachmentCount\":0,\"canManage\":true}],\"pinned\":null,\"page\":{\"number\":0,\"size\":20,\"totalElements\":1,\"totalPages\":1}}");
        return read(
                "{\"postId\":1,\"type\":\"QUESTION\",\"title\":\"질문\",\"content\":\"내용\",\"authorUserId\":\"u\",\"authorNickname\":\"오마\",\"cohortId\":7,\"pinned\":false,\"createdAt\":\"2026-09-14T00:00:00Z\",\"updatedAt\":\"2026-09-14T00:00:00Z\",\"attachments\":[],\"canManage\":true}");
    }

    private static Object adminPayload(HttpServletRequest r) {
        return payload(r);
    }

    private static JsonNode read(String s) {
        try {
            return JSON.readTree(s);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static ParameterDescriptor[] postAttachment() {
        return new ParameterDescriptor[] {
            parameterWithName("post-id").description("게시글 ID"),
            parameterWithName("attachment-id").description("첨부파일 ID")
        };
    }

    private static FieldDescriptor[] postRequest() {
        return new FieldDescriptor[] {
            fieldWithPath("type").description("게시글 유형"),
            fieldWithPath("title").description("제목"),
            fieldWithPath("content").description("내용")
        };
    }

    private static FieldDescriptor[] updateRequest() {
        return new FieldDescriptor[] {
            fieldWithPath("title").description("제목"), fieldWithPath("content").description("내용")
        };
    }

    private static FieldDescriptor[] detailFields() {
        return new FieldDescriptor[] {
            fieldWithPath("postId").description("게시글 ID"),
            fieldWithPath("type").description("유형"),
            fieldWithPath("title").description("제목"),
            fieldWithPath("content").description("내용"),
            fieldWithPath("authorUserId").description("작성자 ID"),
            fieldWithPath("authorNickname").description("작성자 닉네임"),
            fieldWithPath("cohortId").description("기수 ID"),
            fieldWithPath("pinned").description("고정 여부"),
            fieldWithPath("createdAt").description("생성 시각"),
            fieldWithPath("updatedAt").description("수정 시각"),
            fieldWithPath("attachments").description("첨부파일 목록"),
            fieldWithPath("canManage").description("관리 가능 여부")
        };
    }

    private static FieldDescriptor[] listFields() {
        return new FieldDescriptor[] {
            fieldWithPath("items").description("게시글 목록"),
            fieldWithPath("items[].postId").description("게시글 ID"),
            fieldWithPath("items[].type").description("유형"),
            fieldWithPath("items[].title").description("제목"),
            fieldWithPath("items[].authorUserId").description("작성자 ID"),
            fieldWithPath("items[].authorNickname").description("작성자 닉네임"),
            fieldWithPath("items[].cohortId").description("기수 ID"),
            fieldWithPath("items[].pinned").description("고정 여부"),
            fieldWithPath("items[].createdAt").description("생성 시각"),
            fieldWithPath("items[].updatedAt").description("수정 시각"),
            fieldWithPath("items[].attachmentCount").description("첨부 수"),
            fieldWithPath("items[].canManage").description("관리 가능 여부"),
            fieldWithPath("pinned").description("고정 게시글").optional(),
            fieldWithPath("page").description("페이지 정보"),
            fieldWithPath("page.number").description("페이지 번호"),
            fieldWithPath("page.size").description("페이지 크기"),
            fieldWithPath("page.totalElements").description("전체 게시글 수"),
            fieldWithPath("page.totalPages").description("전체 페이지 수")
        };
    }
}
