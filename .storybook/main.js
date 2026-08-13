/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../src/main/frontend/**/*.mdx",
    "../src/main/frontend/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  staticDirs: ["../src/main/resources/static"],
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  framework: "@storybook/react-vite"
};

export default config;
