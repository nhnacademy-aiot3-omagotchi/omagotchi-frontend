package site.omagotchi.frontend.global.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(useDefaultFilters = false)
@AutoConfigureMockMvc(addFilters = false)
@Import({
        ServletApiErrorResponseWriter.class,
        BffApiExceptionResolver.class,
        BffApiExceptionResolverTest.TestRestController.class
})
class BffApiExceptionResolverTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Handler가 없는 BFF 경로의 공통 JSON 404")
    void handlesMissingBffHandlerAsJson() throws Exception {
        // When: 등록되지 않은 BFF Endpoint 요청
        mockMvc.perform(get("/bff/v1/missing"))
                // Then: HTML 오류 Page가 아닌 공통 JSON 404
                .andExpectAll(
                        status().isNotFound(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        header().string(HttpHeaders.CACHE_CONTROL, "no-store"),
                        jsonPath("$.code").value("COMMON_NOT_FOUND"),
                        jsonPath("$.path").value("/bff/v1/missing")
                );
    }

    @Test
    @DisplayName("Controller 실행 전 BFF Method 불일치의 공통 JSON 405")
    void handlesBffMethodMismatchAsJson() throws Exception {
        // When: POST 전용 BFF Endpoint의 PUT 요청
        mockMvc.perform(put("/bff/v1/test/errors/request-body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"test\"}"))
                // Then: Allow Header와 공통 JSON 405
                .andExpectAll(
                        status().isMethodNotAllowed(),
                        header().string(HttpHeaders.ALLOW, "POST"),
                        jsonPath("$.code").value("COMMON_METHOD_NOT_ALLOWED")
                );
    }

    @Test
    @DisplayName("Controller 실행 전 BFF Content-Type 불일치의 공통 JSON 415")
    void handlesBffUnsupportedMediaTypeAsJson() throws Exception {
        // When: JSON 전용 BFF Endpoint의 Text 본문 요청
        mockMvc.perform(post("/bff/v1/test/errors/request-body")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("name=test"))
                // Then: 공통 JSON 415
                .andExpectAll(
                        status().isUnsupportedMediaType(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        jsonPath("$.code").value("COMMON_UNSUPPORTED_MEDIA_TYPE")
                );
    }

    @Test
    @DisplayName("BFF 응답 형식 불일치의 공통 JSON 406")
    void handlesBffNotAcceptableAsJson() throws Exception {
        // When: JSON 전용 BFF Endpoint에 XML 응답 요청
        mockMvc.perform(get("/bff/v1/test/errors/response")
                        .accept(MediaType.APPLICATION_XML))
                // Then: 공통 JSON 406
                .andExpectAll(
                        status().isNotAcceptable(),
                        content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON),
                        jsonPath("$.code").value("COMMON_NOT_ACCEPTABLE")
                );
    }

    @RestController
    public static class TestRestController {

        @PostMapping(
                value = "/bff/v1/test/errors/request-body",
                consumes = MediaType.APPLICATION_JSON_VALUE
        )
        void requestBody(@RequestBody TestRequest request) {
        }

        @GetMapping(
                value = "/bff/v1/test/errors/response",
                produces = MediaType.APPLICATION_JSON_VALUE
        )
        TestRequest response() {
            return new TestRequest("test");
        }
    }

    public record TestRequest(String name) {
    }
}
