package site.omagotchi.frontend.space.presentation.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import site.omagotchi.frontend.learning.infrastructure.request.LearningSpaceMutationRequest;

public record AdminSpaceUpsertRequest(
        @NotBlank(message = "공간 이름은 필수입니다.")
        @Size(max = 50, message = "공간 이름은 50자를 초과할 수 없습니다.")
        String name,

        @NotBlank(message = "공간 유형은 필수입니다.")
        @Pattern(regexp = "MEETING|LAB|STUDY|OFFICE", message = "지원하지 않는 공간 유형입니다.")
        String type,

        @NotNull(message = "공간 정원은 필수입니다.")
        @Min(value = 1, message = "공간 정원은 1명 이상이어야 합니다.")
        Integer capacity,

        @NotNull(message = "관리 기수는 필수입니다.")
        @Min(value = 1, message = "관리 기수가 올바르지 않습니다.")
        Long cohortId
) {
    public LearningSpaceMutationRequest toLearningRequest() {
        return new LearningSpaceMutationRequest(name, type, capacity, cohortId);
    }
}
