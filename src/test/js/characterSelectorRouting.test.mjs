import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const selectorSource = await readFile(
    new URL("../../main/frontend/character-selector/main.jsx", import.meta.url),
    "utf8"
);

test("캐릭터 저장 완료 후 홈 부트스트랩에서 기수·출석 진입을 판정한다", () => {
    assert.match(
        selectorSource,
        /window\.setTimeout\(\(\) => window\.location\.assign\("\/home"\), 600\)/
    );
    assert.doesNotMatch(
        selectorSource,
        /window\.setTimeout\(\(\) => window\.location\.assign\("\/check-in"\), 600\)/
    );
});
