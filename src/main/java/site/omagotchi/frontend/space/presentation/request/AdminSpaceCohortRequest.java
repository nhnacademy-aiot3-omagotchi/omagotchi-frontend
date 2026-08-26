package site.omagotchi.frontend.space.presentation.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import site.omagotchi.frontend.learning.infrastructure.request.LearningAssignSpaceCohortRequest;

public record AdminSpaceCohortRequest(
        @NotNull(message = "관리 기수는 필수입니다.")
        @Min(value = 1, message = "관리 기수가 올바르지 않습니다.")
        Long cohortId
) {
    public LearningAssignSpaceCohortRequest toLearningRequest() {
        return new LearningAssignSpaceCohortRequest(cohortId);
    }
}
