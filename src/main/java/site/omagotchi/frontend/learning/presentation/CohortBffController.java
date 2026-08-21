package site.omagotchi.frontend.learning.presentation;

import tools.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.LearningProxyBffService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/cohorts")
public class CohortBffController {

    private final LearningProxyBffService proxy;

    @GetMapping
    public JsonNode getCohorts(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getCohorts(context.bearerToken()));
    }

    @GetMapping("/{cohortId}")
    public JsonNode getCohort(HttpServletRequest request, @PathVariable Long cohortId) {
        return proxy.execute(request, context -> context.service()
                .getCohort(context.bearerToken(), cohortId));
    }

    @PostMapping("/applications")
    public JsonNode apply(
            HttpServletRequest request,
            @RequestBody JsonNode body
    ) {
        return proxy.execute(request, context -> context.service()
                .applyToCohort(context.bearerToken(), body));
    }

    @GetMapping("/applications/me")
    public JsonNode getMyApplications(HttpServletRequest request) {
        return proxy.execute(request, context -> context.service()
                .getMyCohortApplications(context.bearerToken()));
    }
}
