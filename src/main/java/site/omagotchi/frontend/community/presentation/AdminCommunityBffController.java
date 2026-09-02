package site.omagotchi.frontend.community.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

/**
 * 기수 관리자 대시보드의 커뮤니티 Browser 계약.
 *
 * <p>관리자는 여러 기수를 관리하므로 Session의 승인 기수 하나로는 부족하다. 그래서
 * 대상 기수를 경로에서 받는다. Browser 입력을 그대로 신뢰하는 것은 아니고, Learning
 * Service가 그 기수의 ACTIVE 소속과 MANAGER·MENTOR 역할을 확인한 뒤에야 처리한다.
 * 소속이 아니면 기수 존재를 숨기기 위해 404가 돌아온다.</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/cohorts/{cohort-id}/community/posts")
public class AdminCommunityBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getPosts(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search
    ) {
        return proxy.execute(request, context -> context.service()
                .getCommunityPosts(context.bearerToken(), cohortId, page, size, type, search));
    }

    @PostMapping
    public JsonNode createPost(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .createCommunityPost(context.bearerToken(), cohortId, body));
    }

    @PatchMapping("/{post-id}/pin")
    public JsonNode updatePostPin(
            HttpServletRequest request,
            @PathVariable("cohort-id") Long cohortId,
            @PathVariable("post-id") Long postId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCommunityPostPin(context.bearerToken(), cohortId, postId, body));
    }
}
