package site.omagotchi.frontend.community.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/admin/community/posts")
public class AdminCommunityBffController {

    private final LearningProxyBffService proxy;

    @PatchMapping("/{post-id}/pin")
    public JsonNode updatePostPin(
            HttpServletRequest request,
            @PathVariable("post-id") Long postId,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .updateCommunityPostPin(context.bearerToken(), postId, body));
    }
}
