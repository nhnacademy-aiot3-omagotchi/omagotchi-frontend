import { createMyStudyRecords, resolveMyActiveCohortId } from "./home/myStudyRecords.js";

const api = window.OmagotchiApi?.myStudyRecords;
const records = createMyStudyRecords({
    api,
    preview: false,
    getCohortId: () => resolveMyActiveCohortId(api)
});

records.mount(document.querySelector("[data-study-records]"));
