// 비밀번호 입력창 안의 눈 버튼을 공통으로 처리한다.
document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
        const input = button.closest(".password-input-wrap")?.querySelector("input");

        if (!input) {
            return;
        }

        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";

        button.classList.toggle("is-visible", willShow);
        button.setAttribute("aria-pressed", String(willShow));
        button.setAttribute("aria-label", willShow ? "비밀번호 숨기기" : "비밀번호 표시");
    });
});
