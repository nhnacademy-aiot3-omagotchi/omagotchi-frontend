package site.omagotchi.frontend.learning.presentation;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

import java.util.Arrays;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/community/posts")
public class CommunityBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getPosts(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search
    ) {
        return proxy.execute(request, context -> context.service().getCommunityPosts(
                context.bearerToken(), page, size, type, search
        ));
    }

    @GetMapping("/{postId}")
    public JsonNode getPost(HttpServletRequest request, @PathVariable Long postId) {
        return proxy.execute(request, context -> context.service()
                .getCommunityPost(context.bearerToken(), postId));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode createJson(HttpServletRequest request, @RequestBody JsonNode body) {
        return proxy.execute(request, context -> context.service()
                .createCommunityPost(context.bearerToken(), body));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode createMultipart(
            HttpServletRequest request,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments
    ) {
        return proxy.execute(request, context -> context.service()
                .createCommunityPostMultipart(context.bearerToken(), post, parts(attachments)));
    }

    @PatchMapping(value = "/{postId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode updateJson(
            HttpServletRequest request,
            @PathVariable Long postId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCommunityPost(context.bearerToken(), postId, body));
    }

    @PatchMapping(value = "/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode updateMultipart(
            HttpServletRequest request,
            @PathVariable Long postId,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCommunityPostMultipart(context.bearerToken(), postId, post, parts(attachments)));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> delete(HttpServletRequest request, @PathVariable Long postId) {
        proxy.execute(request, context -> context.service()
                .deleteCommunityPost(context.bearerToken(), postId));
        return ResponseEntity.noContent().build();
    }

    private static List<HttpEntity<Resource>> parts(MultipartFile[] attachments) {
        if (attachments == null || attachments.length == 0) {
            return List.of();
        }
        return Arrays.stream(attachments).map(file -> {
            HttpHeaders headers = new HttpHeaders();
            if (file.getContentType() != null) {
                headers.setContentType(MediaType.parseMediaType(file.getContentType()));
            }
            return new HttpEntity<>(file.getResource(), headers);
        }).toList();
    }
}
