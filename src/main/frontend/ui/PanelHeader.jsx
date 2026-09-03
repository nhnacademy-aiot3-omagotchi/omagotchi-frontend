import React from "react";
import PropTypes from "prop-types";

/**
 * 홈의 모든 패널 머리말. 오버레이 8종, AI 도우미, BGM, 출석 현황이 같은 규칙을 쓴다.
 *
 *   [아이콘] [제목 / 설명]                              [보조 버튼…] [닫기]
 *
 * 합치기 전에는 같은 모양을 세 벌로 나눠 갖고 있었다.
 *   home-overlay-header  (오버레이)   home-ai-panel-heading (AI)   quick-panel-header (BGM·출석)
 * 게다가 오버레이 안에서도 CSS가 `:not(--help):not(--space)`로 6종의 아이콘을 감추고
 * 설명을 스크린리더 전용으로 돌려 타입마다 다르게 보였다. 그 분기를 모두 걷어냈다.
 *
 * 제목·설명 id는 바깥 컨테이너의 aria-labelledby/-describedby가 참조한다.
 * 기본값을 바꾸면 참조하는 쪽도 함께 고쳐야 한다.
 */
export function PanelHeader({
  icon,
  title,
  description,
  titleId,
  descriptionId,
  actions = null,
  closeButton = null,
  className = ""
}) {
  return (
    <header className={`panel-header${className ? ` ${className}` : ""}`}>
      {/* 아이콘은 장식이다. 제목이 같은 뜻을 전달하므로 보조기기에서 감춘다. */}
      <span className="panel-header-icon" aria-hidden="true">
        {icon ? <img src={icon} alt="" /> : null}
      </span>

      <div className="panel-header-heading">
        <h2 id={titleId}>{title}</h2>
        {/* 설명 없는 패널이 생겨도 빈 줄이 자리를 차지하지 않게 한다. */}
        {description ? <p id={descriptionId}>{description}</p> : null}
      </div>

      {/* 보조 버튼과 닫기는 항상 오른쪽 끝에 모인다. 없으면 칸도 생기지 않는다. */}
      {(actions || closeButton) ? (
        <div className="panel-header-actions">
          {actions}
          {closeButton}
        </div>
      ) : null}
    </header>
  );
}

PanelHeader.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  titleId: PropTypes.string,
  descriptionId: PropTypes.string,
  actions: PropTypes.node,
  closeButton: PropTypes.node,
  className: PropTypes.string
};
