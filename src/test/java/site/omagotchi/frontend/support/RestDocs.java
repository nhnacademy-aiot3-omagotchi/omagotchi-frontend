package site.omagotchi.frontend.support;

import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.replacePattern;

import java.net.URI;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.restdocs.mockmvc.MockMvcRestDocumentation;
import org.springframework.restdocs.operation.OperationRequest;
import org.springframework.restdocs.operation.OperationRequestFactory;
import org.springframework.restdocs.operation.preprocess.OperationRequestPreprocessor;
import org.springframework.restdocs.operation.preprocess.OperationResponsePreprocessor;
import org.springframework.restdocs.snippet.Snippet;
import org.springframework.test.web.servlet.ResultHandler;

/** REST Docs helpers shared by controller contract tests. */
public final class RestDocs {

    private static final OperationRequestFactory REQUEST_FACTORY = new OperationRequestFactory();
    private static final OperationRequestPreprocessor REQUEST_REDACTOR = RestDocs::redactRequest;
    // REST Docs는 첫 번째 캡처 그룹만 치환하므로 JSON 키와 따옴표는 그룹 밖에 둡니다.
    private static final OperationRequestPreprocessor SECRET_VALUES =
            preprocessRequest(
                    replacePattern(
                            Pattern.compile(
                                    "(?:\\\"(?:password|currentPassword|newPassword|code|challengeId)\\\"\\s*:\\s*\\\")((?:\\\\.|[^\\\"\\\\])*)"),
                            "[REDACTED]"),
                    replacePattern(
                            Pattern.compile("(?:^|[&\\r\\n])(?:password|_csrf)=([^&\\s]*)"),
                            "[REDACTED]"));

    private RestDocs() {}

    public static ResultHandler document(String identifier, Snippet... snippets) {
        return MockMvcRestDocumentation.document(identifier, REQUEST_REDACTOR, snippets);
    }

    public static ResultHandler document(
            String identifier,
            OperationRequestPreprocessor requestPreprocessor,
            Snippet... snippets) {
        return MockMvcRestDocumentation.document(
                identifier, compose(requestPreprocessor, REQUEST_REDACTOR), snippets);
    }

    public static ResultHandler document(
            String identifier,
            OperationResponsePreprocessor responsePreprocessor,
            Snippet... snippets) {
        return MockMvcRestDocumentation.document(
                identifier, REQUEST_REDACTOR, responsePreprocessor, snippets);
    }

    public static ResultHandler document(
            String identifier,
            OperationRequestPreprocessor requestPreprocessor,
            OperationResponsePreprocessor responsePreprocessor,
            Snippet... snippets) {
        return MockMvcRestDocumentation.document(
                identifier,
                compose(requestPreprocessor, REQUEST_REDACTOR),
                responsePreprocessor,
                snippets);
    }

    private static OperationRequestPreprocessor compose(
            OperationRequestPreprocessor first, OperationRequestPreprocessor second) {
        return request -> second.preprocess(first.preprocess(request));
    }

    static OperationRequest redactRequest(OperationRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.putAll(request.getHeaders());
        for (String name : List.of("X-CSRF-TOKEN", "X-XSRF-TOKEN")) {
            if (headers.containsHeader(name)) {
                headers.set(name, "[CSRF_TOKEN]");
            }
        }
        String uri = request.getUri().toASCIIString()
                .replaceAll("([?&]_csrf=)[^&#]*", "$1CSRF_TOKEN");
        OperationRequest redacted = REQUEST_FACTORY.create(
                URI.create(uri), request.getMethod(), request.getContent(), headers,
                request.getParts(), request.getCookies());
        return SECRET_VALUES.preprocess(redacted);
    }
}
