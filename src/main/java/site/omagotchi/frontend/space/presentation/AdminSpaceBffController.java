package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.space.application.AdminSpaceBffService;
import site.omagotchi.frontend.space.presentation.request.AdminSpaceDeactivateRequest;
import site.omagotchi.frontend.space.presentation.request.AdminSpaceCohortRequest;
import site.omagotchi.frontend.space.presentation.request.AdminSpaceUpsertRequest;
import site.omagotchi.frontend.space.presentation.request.AdminSpaceUpdateRequest;
import tools.jackson.databind.JsonNode;
import site.omagotchi.frontend.learning.infrastructure.response.LearningAdminActiveOccupancyResponse;
import site.omagotchi.frontend.learning.infrastructure.response.LearningOccupancyParticipantResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/admin/spaces")
public class AdminSpaceBffController {

    private final AdminSpaceBffService adminSpaceBffService;

    @GetMapping("/occupancies")
    public List<LearningAdminActiveOccupancyResponse> getActiveOccupancies(
            HttpServletRequest request
    ) {
        return adminSpaceBffService.getActiveOccupancies(request);
    }

    @GetMapping("/{spaceId}/occupancies/participants")
    public List<LearningOccupancyParticipantResponse> getParticipants(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.getParticipants(spaceId, request);
    }

    @PostMapping("/{spaceId}/occupancies/force-release")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forceRelease(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        adminSpaceBffService.forceRelease(spaceId, request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode create(
            @Valid @RequestBody AdminSpaceUpsertRequest body,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.create(body.toLearningRequest(), request);
    }

    @PutMapping("/{spaceId}")
    public JsonNode update(
            @PathVariable Long spaceId,
            @Valid @RequestBody AdminSpaceUpdateRequest body,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.update(spaceId, body.toLearningRequest(), request);
    }

    @PostMapping("/{spaceId}/activate")
    public JsonNode activate(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.activate(spaceId, request);
    }

    @PostMapping("/{spaceId}/deactivate")
    public JsonNode deactivate(
            @PathVariable Long spaceId,
            @Valid @RequestBody AdminSpaceDeactivateRequest body,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.deactivate(spaceId, body.inactiveReason(), request);
    }

    @DeleteMapping("/{spaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        adminSpaceBffService.delete(spaceId, request);
    }

    @PutMapping("/{spaceId}/cohort")
    public JsonNode assignCohort(
            @PathVariable Long spaceId,
            @Valid @RequestBody AdminSpaceCohortRequest body,
            HttpServletRequest request
    ) {
        return adminSpaceBffService.assignCohort(spaceId, body.toLearningRequest(), request);
    }

    @DeleteMapping("/{spaceId}/cohort")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignCohort(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        adminSpaceBffService.unassignCohort(spaceId, request);
    }
}
