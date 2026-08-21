package site.omagotchi.frontend.learning.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.learning.application.ProfileBffService;
import site.omagotchi.frontend.learning.infrastructure.request.UpdateNicknameRequest;
import site.omagotchi.frontend.learning.infrastructure.response.UserNicknameResponse;
import site.omagotchi.frontend.learning.infrastructure.response.UserProfileResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/bff/v1/me")
public class ProfileBffController {

    private final ProfileBffService profileBffService;

    @GetMapping("/profile")
    public UserProfileResponse getMyProfile(HttpServletRequest request) {
        return profileBffService.getMyProfile(request);
    }

    @PatchMapping("/nickname")
    public UserNicknameResponse updateMyNickname(
            HttpServletRequest servletRequest,
            @Valid @RequestBody UpdateNicknameRequest request
    ) {
        return profileBffService.updateMyNickname(servletRequest, request);
    }
}
