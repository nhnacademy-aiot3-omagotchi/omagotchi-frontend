import { createStudyRecords } from "./home/studyRecords.js";

const records = createStudyRecords({
    api: window.OmagotchiApi?.study
});

const root = document.querySelector("[data-study-records]");
records.mount(root);
// click event 발생
root?.addEventListener("click", (event) => {
    records.handleClick(event);
});
// 날짜와 시간 입력값을 가능한 학습 구간 안으로 즉시 보정
root?.addEventListener("input", (event) => {
    records.handleInput(event);
});
// submit event 발생
root?.addEventListener("submit", (event) => {
    records.handleSubmit(event);
});
