package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.presentation.response.OccupancyResponse;
import site.omagotchi.frontend.space.presentation.response.SpaceResponse;
import site.omagotchi.frontend.space.presentation.request.AddParticipantRequest;
import site.omagotchi.frontend.space.presentation.response.ParticipantCandidateResponse;
import site.omagotchi.frontend.space.presentation.response.OccupancyParticipantResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/spaces")
public class SpaceBffController {

    private final SpaceBffService spaceBffService;

    @GetMapping
    public List<SpaceResponse> findAll(HttpServletRequest request) {
        return spaceBffService.findAll(request).stream()
                .map(SpaceResponse::from)
                .toList();
    }

    @PostMapping("/{spaceId}/occupancies")
    @ResponseStatus(HttpStatus.CREATED)
    public OccupancyResponse startOccupancy(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        return OccupancyResponse.from(
                spaceBffService.startOccupancy(spaceId, request)
        );
    }

    @PostMapping("/{spaceId}/occupancies/extend")
    public OccupancyResponse extendOccupancy(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        return OccupancyResponse.from(
                spaceBffService.extendOccupancy(spaceId, request)
        );
    }

    @PostMapping("/{spaceId}/occupancies/release")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void releaseOccupancy(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        spaceBffService.releaseOccupancy(spaceId, request);
    }

    @DeleteMapping("/{spaceId}/occupancies/participants/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveOccupancy(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        spaceBffService.leaveOccupancy(spaceId, request);
    }

    @GetMapping("/{spaceId}/occupancies/participants")
    public List<OccupancyParticipantResponse> getParticipants(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        return spaceBffService.getParticipants(spaceId, request).stream()
                .map(OccupancyParticipantResponse::from)
                .toList();
    }

    @GetMapping("/{spaceId}/occupancies/participants/candidates")
    public List<ParticipantCandidateResponse> searchParticipantCandidates(
            @PathVariable Long spaceId,
            @RequestParam String query,
            HttpServletRequest request
    ) {
        return spaceBffService.searchParticipantCandidates(spaceId, query, request).stream()
                .map(ParticipantCandidateResponse::from)
                .toList();
    }

    @PostMapping("/{spaceId}/occupancies/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public void addParticipant(
            @PathVariable Long spaceId,
            @Valid @RequestBody AddParticipantRequest body,
            HttpServletRequest request
    ) {
        spaceBffService.addParticipant(spaceId, body.targetUserId(), request);
    }

    @DeleteMapping("/{spaceId}/occupancies/participants/{targetUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeParticipant(
            @PathVariable Long spaceId,
            @PathVariable UUID targetUserId,
            HttpServletRequest request
    ) {
        spaceBffService.removeParticipant(spaceId, targetUserId, request);
    }

    @PostMapping("/{spaceId}/vacancy-alerts")
    @ResponseStatus(HttpStatus.CREATED)
    public void requestVacancyAlert(
            @PathVariable Long spaceId,
            HttpServletRequest request
    ) {
        spaceBffService.requestVacancyAlert(spaceId, request);
    }

}
