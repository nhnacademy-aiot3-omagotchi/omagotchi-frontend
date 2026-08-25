/**
 * home-ui.css 는 내부가 @import url("./ui/xxx.css?v=...") 로만 구성되어 있다.
 * Vite(Storybook)는 쿼리스트링이 붙은 @import 를 인라인하지 못하고 그대로 남기기 때문에
 * 번들 결과물 기준 상대경로가 깨져 해당 CSS 가 전부 404 가 된다.
 * 그래서 .storybook/preview.jsx 는 ui/*.css 를 직접 import 해야 하고,
 * home-ui.css 에 파일이 추가/삭제되면 preview.jsx 도 같이 바뀌어야 한다.
 * 이 테스트는 그 동기화가 깨지는 순간을 잡는다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HOME_UI = path.join(ROOT, "src/main/resources/static/css/home/home-ui.css");
const PREVIEW = path.join(ROOT, ".storybook/preview.jsx");

function read(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    assert.fail(`필수 파일을 읽지 못했습니다: ${file} (${error.code ?? error.message})`);
  }
}

/** home-ui.css 안의 @import 대상 파일명만 뽑는다. (url() 유무, 따옴표 종류, 쿼리스트링 모두 허용) */
function collectImportedFileNames(css) {
  const pattern = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g;
  const names = [];
  for (const match of css.matchAll(pattern)) {
    const target = match[1].split("?")[0].split("#")[0].trim();
    if (target) names.push(path.posix.basename(target));
  }
  return names;
}

test("home-ui.css 가 @import 하는 CSS 는 preview.jsx 에서도 직접 import 되어야 한다", () => {
  const imported = collectImportedFileNames(read(HOME_UI));
  assert.ok(imported.length > 0, "home-ui.css 에서 @import 를 하나도 찾지 못했습니다. 정규식/파일 구조를 확인하세요.");

  const preview = read(PREVIEW);
  const missing = imported.filter((name) => !preview.includes(`/home/ui/${name}`));

  assert.deepEqual(
    missing,
    [],
    `.storybook/preview.jsx 에 누락된 CSS: ${missing.join(", ")} — Storybook 에서 해당 스타일이 통째로 적용되지 않습니다.`
  );
});

test("preview.jsx 는 home-ui.css 를 직접 import 하지 않는다", () => {
  const preview = read(PREVIEW);
  const importsHomeUi = /import\s+["'][^"']*\/home\/home-ui\.css["']/.test(preview);
  assert.equal(
    importsHomeUi,
    false,
    "preview.jsx 가 home-ui.css 를 직접 import 하고 있습니다. Vite 가 쿼리스트링 @import 를 해석하지 못해 404 가 발생합니다."
  );
});
