package site.omagotchi.frontend.space.presentation;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import site.omagotchi.frontend.global.web.BffApiPaths;
import site.omagotchi.frontend.space.application.SpaceBffService;
import site.omagotchi.frontend.space.presentation.response.VacancyAlertResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(BffApiPaths.PREFIX + "/vacancy-alerts")
public class VacancyAlertBffController {

    private final SpaceBffService spaceBffService;

    @GetMapping("/me")
    public List<VacancyAlertResponse> getMine(HttpServletRequest request) {
        return spaceBffService.getMyVacancyAlerts(request).stream()
                .map(VacancyAlertResponse::from)
                .toList();
    }

    @DeleteMapping("/{alertId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long alertId, HttpServletRequest request) {
        spaceBffService.cancelVacancyAlert(alertId, request);
    }
}
