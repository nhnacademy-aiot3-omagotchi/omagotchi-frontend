/**
 * 실제 Home용 내용 어댑터.
 * Storybook 전용 fixture나 mock Panel을 가져오지 않고,
 * home.js가 만든 내부 템플릿만 감싼다.
 */
export function HomeMenuLiveContent({ menu, content }) {
  return (
    <div
      className={`ui-menu-live-content ui-menu-live-content--${menu}`}
      data-ui-state="ready"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
