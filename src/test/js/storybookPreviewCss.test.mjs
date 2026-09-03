/**
 * Storybook(.storybook/preview.jsx) 과 운영 홈(pages/app/home.html) 의 CSS 로드 목록 동기화 가드.
 *
 * 배경 1) home-ui.css 는 내부가 @import url("./ui/xxx.css?v=...") 로만 구성되어 있다.
 *         Vite 는 쿼리스트링이 붙은 @import 를 인라인하지 못하고 그대로 남기므로,
 *         번들 결과물 기준 상대경로가 깨져 해당 CSS 가 전부 404 가 된다.
 *         => preview.jsx 는 home-ui.css 대신 ui/*.css 를 직접 import 해야 한다.
 *
 * 배경 2) home.html 에만 있고 preview.jsx 에 없는 CSS 가 생기면
 *         "스토리북에서만 스타일이 없는" 상태가 조용히 만들어진다.
 *         (실제 사고: AI 도우미 패널 전체, 파티원 초대 드롭다운(spaceRoom.css))
 *
 * 배경 3) 반대 방향도 똑같이 위험하다. preview.jsx 에만 있고 home.html 에 없는 CSS 가 생기면
 *         "스토리북에서는 멀쩡한데 운영 화면에서만 스타일이 통째로 빠지는" 상태가 된다.
 *         (실제 사고: 공통 PanelHeader 의 panel-header.css 를 preview.jsx 에만 추가해서
 *          운영 홈의 8개 오버레이 헤더가 전부 무스타일로 나갔다.)
 *
 * 이 테스트는 그 세 가지가 어긋나는 순간을 잡는다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CSS_DIR = "src/main/resources/static/css";
const HOME_UI = path.join(ROOT, CSS_DIR, "home/home-ui.css");
const HOME_HTML = path.join(ROOT, "src/main/resources/templates/pages/app/home.html");
const PREVIEW = path.join(ROOT, ".storybook/preview.jsx");

/** home.html 이 로드하지만 스토리북에는 의도적으로 넣지 않는 파일이 생기면 여기에 사유와 함께 적는다. */
const INTENTIONALLY_SKIPPED = new Map([
  // ["예시.css", "사유"],
]);

/**
 * preview.jsx 에만 있어도 되는 파일. 홈 화면이 아닌 다른 페이지의 스토리 전용이라 home.html 에 없는 것이 정상이다.
 * 여기에 등록하지 않은 파일이 preview.jsx 에만 있으면, 운영 화면에서만 스타일이 빠졌다는 뜻이므로 실패시킨다.
 */
const STORYBOOK_ONLY = new Map([
  ["auth.css", "로그인/회원가입 페이지 전용 (pages/auth/*.html 에서 로드)"],
  ["characterSelector.css", "캐릭터 선택 페이지 전용 (characterSelector 스토리에서만 사용)"]
]);

function read(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    assert.fail(`필수 파일을 읽지 못했습니다: ${file} (${error.code ?? error.message})`);
  }
}

/** "/css/home/ui/toast.css?v=1" → "home/ui/toast.css" (쿼리·해시·앞쪽 /css/ 제거) */
function toCssRelativePath(rawHref) {
  const clean = rawHref.split("?")[0].split("#")[0].trim();
  const marker = "/css/";
  const index = clean.indexOf(marker);
  return index === -1 ? null : clean.slice(index + marker.length);
}

function collectHomeHtmlCss(html) {
  const found = new Set();
  // href="..." 와 th:href="@{...}" 양쪽 모두에서 수집한다.
  for (const match of html.matchAll(/(?:th:)?href\s*=\s*"([^"]+\.css[^"]*)"/g)) {
    const relative = toCssRelativePath(match[1].replace(/^@\{/, "").replace(/[)}]+$/, "").replace(/\(.*$/, ""));
    if (relative) found.add(relative);
  }
  return [...found].sort();
}

function collectHomeUiImports(css) {
  const names = [];
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) {
    const target = match[1].split("?")[0].split("#")[0].trim();
    if (target) names.push(`home/${path.posix.normalize(target).replace(/^\.\//, "")}`);
  }
  return names;
}

/** preview.jsx 의 `import ".../css/xxx.css"` 들을 home.html 과 같은 상대경로 표기로 모은다. */
function collectPreviewCss(preview) {
  const found = new Set();
  for (const match of preview.matchAll(/import\s+["']([^"']+\.css)["']/g)) {
    const relative = toCssRelativePath(match[1]);
    if (relative) found.add(relative);
  }
  return [...found].sort();
}

test("preview.jsx 는 home-ui.css 를 직접 import 하지 않는다", () => {
  const preview = read(PREVIEW);
  assert.equal(
    /import\s+["'][^"']*\/home\/home-ui\.css["']/.test(preview),
    false,
    "preview.jsx 가 home-ui.css 를 직접 import 하고 있습니다. Vite 가 쿼리스트링 @import 를 해석하지 못해 404 가 발생합니다."
  );
});

test("home-ui.css 가 @import 하는 CSS 는 preview.jsx 에서도 직접 import 되어야 한다", () => {
  const imported = collectHomeUiImports(read(HOME_UI));
  assert.ok(imported.length > 0, "home-ui.css 에서 @import 를 하나도 찾지 못했습니다. 파일 구조를 확인하세요.");

  const preview = read(PREVIEW);
  const missing = imported.filter((relative) => !preview.includes(`/${CSS_DIR}/${relative}`));

  assert.deepEqual(missing, [], `preview.jsx 에 누락된 CSS: ${missing.join(", ")}`);
});

test("home.html 이 로드하는 CSS 는 preview.jsx 에도 있어야 한다", () => {
  const htmlCss = collectHomeHtmlCss(read(HOME_HTML));
  assert.ok(htmlCss.length > 5, `home.html 에서 CSS 링크를 제대로 찾지 못했습니다 (${htmlCss.length}개). 정규식을 확인하세요.`);

  const preview = read(PREVIEW);
  const missing = [];

  for (const relative of htmlCss) {
    if (INTENTIONALLY_SKIPPED.has(relative)) continue;
    // home-ui.css 는 위 테스트가 자식 파일 단위로 이미 검사한다.
    if (relative === "home/home-ui.css") continue;
    if (!preview.includes(`/${CSS_DIR}/${relative}`)) missing.push(relative);
  }

  assert.deepEqual(
    missing,
    [],
    `home.html 에는 있고 preview.jsx 에는 없는 CSS: ${missing.join(", ")}\n` +
      "→ 스토리북에서만 스타일이 통째로 빠집니다. preview.jsx 에 추가하거나, " +
      "의도적으로 제외한 것이면 INTENTIONALLY_SKIPPED 에 사유와 함께 등록하세요."
  );
});

test("preview.jsx 가 import 하는 CSS 는 home.html 에도 있어야 한다", () => {
  // 배경 3). 이 방향을 검사하지 않으면 "스토리북에서만 예뻐 보이는" 컴포넌트가 만들어진다.
  const previewCss = collectPreviewCss(read(PREVIEW));
  assert.ok(previewCss.length > 5, `preview.jsx 에서 CSS import 를 제대로 찾지 못했습니다 (${previewCss.length}개). 정규식을 확인하세요.`);

  const htmlCss = new Set(collectHomeHtmlCss(read(HOME_HTML)));
  // home.html 은 ui/*.css 를 home-ui.css 의 @import 로 한 번에 로드한다. 위 테스트가 이미 짝을 맞춰 검사한다.
  const viaHomeUi = new Set(collectHomeUiImports(read(HOME_UI)));

  const missing = previewCss.filter(
    (relative) => !htmlCss.has(relative) && !viaHomeUi.has(relative) && !STORYBOOK_ONLY.has(relative)
  );

  assert.deepEqual(
    missing,
    [],
    `preview.jsx 에는 있고 home.html 에는 없는 CSS: ${missing.join(", ")}\n` +
      "→ 운영 홈 화면에서만 스타일이 통째로 빠집니다. home.html 에 <link> 를 추가하거나, " +
      "홈이 아닌 다른 페이지 전용이면 STORYBOOK_ONLY 에 사유와 함께 등록하세요."
  );
});

test("CSS 의 @import 는 절대경로(/css/...)를 쓰지 않는다", () => {
  // 절대경로 @import 는 브라우저에서만 동작하고, 번들러(Vite/postcss-import)는
  // 파일시스템 루트로 해석해 ENOENT 로 죽는다. 상대경로(./)는 양쪽 모두에서 동작한다.
  const cssRoot = path.join(ROOT, CSS_DIR);
  const offenders = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".css")) continue;
      const css = readFileSync(full, "utf8");
      for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["'](\/[^"']+)["']/g)) {
        offenders.push(`${path.relative(ROOT, full)} → ${match[1]}`);
      }
    }
  };
  walk(cssRoot);

  assert.deepEqual(
    offenders,
    [],
    `절대경로 @import 발견:\n  ${offenders.join("\n  ")}\n→ "./" 로 시작하는 상대경로로 바꾸세요.`
  );
});
