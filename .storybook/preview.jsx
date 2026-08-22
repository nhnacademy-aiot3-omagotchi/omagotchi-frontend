import "../src/main/resources/static/css/gameFont.css";
import "../src/main/resources/static/css/home.css";
import "../src/main/resources/static/css/home/home-ui.css";
import "../src/main/resources/static/css/home/react-stage.css";
import "../src/main/resources/static/css/home/home-responsive.css";
import "../src/main/resources/static/css/home/home-overlay-theme.css";
import "../src/main/resources/static/css/home/home-quick-panels.css";
import "../src/main/resources/static/css/ui/design-system.css";
import "../src/main/resources/static/css/studyRecords.css";
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
