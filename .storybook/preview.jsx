/*
 * [중요] home-ui.css 를 직접 import 하지 않는다.
 *
 * home-ui.css 는 내부가 전부 @import url("./ui/xxx.css?v=...") 로만 구성되어 있다.
 * Thymeleaf(/css/home/home-ui.css) 로 로드될 때는 상대경로가 /css/home/ui/ 로 풀려서 정상 동작하지만,
 * Vite(Storybook)가 번들할 때는 쿼리스트링(?v=) 때문에 postcss-import 가 파일을 해석하지 못하고
 * @import 문을 그대로 남겨둔다. 그 결과 번들 결과물(/assets/iframe-*.css) 기준으로
 * ./ui/xxx.css → /assets/ui/xxx.css 로 요청되어 전부 404 가 되고,
 * status-dock / bgm / dock-actions / attendance / toast / character-chat / responsive
 * 7개 파일의 스타일이 통째로 사라진다. (AI 도우미 패널 스타일이 안 먹던 원인)
 *
 * 따라서 Storybook 에서는 home-ui.css 가 @import 하던 파일들을 "같은 순서로" 직접 import 한다.
 * home-ui.css 에 파일을 추가/삭제하면 아래 목록도 반드시 함께 갱신할 것.
 */
import "../src/main/resources/static/css/home.css";
import "../src/main/resources/static/css/home/ui/status-dock.css";
import "../src/main/resources/static/css/home/ui/bgm.css";
import "../src/main/resources/static/css/home/ui/dock-actions.css";
import "../src/main/resources/static/css/home/ui/attendance.css";
import "../src/main/resources/static/css/home/ui/toast.css";
import "../src/main/resources/static/css/home/ui/character-chat.css";
import "../src/main/resources/static/css/home/ui/responsive.css";
import "../src/main/resources/static/css/home/react-stage.css";
import "../src/main/resources/static/css/studyRecords.css";
import "../src/main/resources/static/css/gameFont.css";
import "../src/main/resources/static/css/ui/design-system.css";
import "../src/main/resources/static/css/home/home-responsive.css";
import "../src/main/resources/static/css/home/home-overlay-theme.css";
import "../src/main/resources/static/css/home/home-quick-panels.css";
/* home.html 에는 없고 characterSelector 스토리 전용 */
import "../src/main/resources/static/css/characterSelector.css";

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    }
  },
};

export default preview;
