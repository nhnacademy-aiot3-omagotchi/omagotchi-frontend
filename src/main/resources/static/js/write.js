import { createStudyRecords } from "./home/studyRecords.js";

const currentUserEmail = sessionStorage.getItem("omagotchiEmail")
    || localStorage.getItem("omagotchiLastEmail")
    || "guest";

const records = createStudyRecords({
    storageKey: `omagotchiStudyRecords:${currentUserEmail}`,
    getElapsedSeconds: () => 0
});

const root = document.querySelector("[data-study-records]");
records.mount(root);

root?.addEventListener("click", (event) => {
    records.handleClick(event);
});

root?.addEventListener("submit", (event) => {
    records.handleSubmit(event);
});
