package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.space.application.SpaceEnvironmentBffService;
import site.omagotchi.frontend.space.presentation.response.SpaceEnvironmentResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/spaces/environment")
public class SpaceEnvironmentBffController {

    private final SpaceEnvironmentBffService spaceEnvironmentBffService;

    @GetMapping
    public List<SpaceEnvironmentResponse> findMyCohortEnvironments(HttpServletRequest request) {
        return spaceEnvironmentBffService.findMyCohortEnvironments(request).stream()
                .map(SpaceEnvironmentResponse::from)
                .toList();
    }
}
