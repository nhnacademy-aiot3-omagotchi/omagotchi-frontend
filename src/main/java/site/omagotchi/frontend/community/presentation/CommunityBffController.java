package site.omagotchi.frontend.community.presentation;

import tools.jackson.databind.JsonNode;
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
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

import java.util.Arrays;
import java.util.List;

/**
 * 사용자 홈의 커뮤니티 Browser 계약.
 *
 * <p>게시판은 기수에 속하지만 cohortId를 경로에서 받지 않는다. Browser가 지정하면 다른 기수
 * 게시판을 조회하는 요청을 만들 수 있으므로, 조회 대상 기수는 Session 기반 승인 기수로
 * 확보한다. 랭킹·출결과 같은 방식이다.</p>
 */
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
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getCommunityPosts(context.bearerToken(), cohortId, page, size, type, search));
    }

    @GetMapping("/{post-id}")
    public JsonNode getPost(HttpServletRequest request, @PathVariable("post-id") Long postId) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .getCommunityPost(context.bearerToken(), cohortId, postId));
    }

    @GetMapping("/{post-id}/attachments/{attachment-id}")
    public ResponseEntity<Resource> downloadAttachment(
            HttpServletRequest request,
            @PathVariable("post-id") Long postId,
            @PathVariable("attachment-id") Long attachmentId
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .downloadCommunityAttachment(context.bearerToken(), cohortId, postId, attachmentId));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode createJson(HttpServletRequest request, @RequestBody JsonNode body) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .createCommunityPost(context.bearerToken(), cohortId, body));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode createMultipart(
            HttpServletRequest request,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .createCommunityPostMultipart(context.bearerToken(), cohortId, post, parts(attachments)));
    }

    @PatchMapping(value = "/{post-id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode updateJson(
            HttpServletRequest request,
            @PathVariable("post-id") Long postId,
            @RequestBody JsonNode body
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .updateCommunityPost(context.bearerToken(), cohortId, postId, body));
    }

    @PatchMapping(value = "/{post-id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JsonNode updateMultipart(
            HttpServletRequest request,
            @PathVariable("post-id") Long postId,
            @RequestPart("post") JsonNode post,
            @RequestPart(value = "attachments", required = false) MultipartFile[] attachments
    ) {
        return proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .updateCommunityPostMultipart(context.bearerToken(), cohortId, postId, post, parts(attachments)));
    }

    @DeleteMapping("/{post-id}")
    public ResponseEntity<Void> delete(HttpServletRequest request, @PathVariable("post-id") Long postId) {
        proxy.executeWithCohort(request, (context, cohortId) -> context.service()
                .deleteCommunityPost(context.bearerToken(), cohortId, postId));
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
