import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {saveCommunityPost} from "../../main/resources/static/js/home/community.js";

const overlayCss = await readFile(
    new URL("../../main/resources/static/css/home/home-overlay-theme.css", import.meta.url),
    "utf8"
);
const toastCss = await readFile(
    new URL("../../main/resources/static/css/home/ui/toast.css", import.meta.url),
    "utf8"
);

function createForm({postId, title = " 제목 ", content = " 내용 ", type = "free", attachments = []} = {}) {
    const attributes = new Map();
    const submitButton = {disabled: false, textContent: postId ? "수정하기" : "등록하기"};
    const form = {
        dataset: postId ? {communityPostId: postId} : {},
        values: new Map([["title", title], ["content", content], ["type", type]]),
        querySelector(selector) {
            if (selector === "button[type='submit']") return submitButton;
            if (selector === "input[name='attachments']") return {files: attachments};
            return null;
        },
        setAttribute(name, value) {
            attributes.set(name, value);
        },
        removeAttribute(name) {
            attributes.delete(name);
        }
    };
    return {attributes, form, submitButton};
}

async function withFakeFormData(callback) {
    const OriginalFormData = globalThis.FormData;
    globalThis.FormData = class {
        constructor(form) {
            this.values = form.values;
        }

        get(name) {
            return this.values.get(name);
        }
    };
    try {
        await callback();
    } finally {
        globalThis.FormData = OriginalFormData;
    }
}

test("게시글 등록 중에는 중복 제출을 막고 성공 메시지를 반환한다", async () => {
    await withFakeFormData(async () => {
        const {attributes, form, submitButton} = createForm();
        let finishRequest;
        const requests = [];
        const api = {
            createPost(post) {
                requests.push(post);
                return new Promise((resolve) => {
                    finishRequest = resolve;
                });
            }
        };

        const firstSubmit = saveCommunityPost({form, api, cohortId: 7});
        const duplicateSubmit = await saveCommunityPost({form, api, cohortId: 7});

        assert.equal(duplicateSubmit, null);
        assert.equal(requests.length, 1);
        assert.equal(submitButton.disabled, true);
        assert.equal(submitButton.textContent, "등록 중…");
        assert.equal(attributes.get("aria-busy"), "true");

        finishRequest();
        const result = await firstSubmit;

        assert.deepEqual(requests[0], {
            type: "FREE",
            title: "제목",
            content: "내용"
        });
        assert.deepEqual(result, {action: "created", message: "게시글이 등록되었습니다."});
        assert.equal(submitButton.disabled, false);
        assert.equal(submitButton.textContent, "등록하기");
        assert.equal(attributes.has("aria-busy"), false);
    });
});

test("게시글 저장 실패 뒤에는 제출 버튼을 다시 활성화한다", async () => {
    await withFakeFormData(async () => {
        const {form, submitButton} = createForm();
        const api = {
            async createPost() {
                throw new Error("저장 실패");
            }
        };

        await assert.rejects(
            saveCommunityPost({form, api, cohortId: 7}),
            /저장 실패/
        );
        assert.equal(submitButton.disabled, false);
        assert.equal(submitButton.textContent, "등록하기");
        assert.equal(form.dataset.communitySubmitting, undefined);
    });
});

test("커뮤니티 목록 행은 버튼 전체 폭을 쓰고 버튼 내부에서만 열을 나눈다", () => {
    assert.match(
        overlayCss,
        /\.home-overlay--community \.overlay-community-list li\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s
    );
    assert.match(
        overlayCss,
        /\.home-overlay--community \.overlay-community-open\s*\{[^}]*grid-template-columns:\s*48px minmax\(0, 1fr\) auto/s
    );
    assert.match(
        overlayCss,
        /\.home-overlay--community \.overlay-community-open > footer\s*\{[^}]*grid-column:\s*2/s
    );
});

test("홈 토스트는 모바일 오버레이보다 위에 표시된다", () => {
    const zIndex = Number(toastCss.match(/\.home-toast\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
    assert.ok(zIndex > 1000, `home toast z-index가 너무 낮습니다: ${zIndex}`);
});
