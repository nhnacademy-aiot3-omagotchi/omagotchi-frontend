import React, { useEffect, useState } from "react";

/**
 * 텔레그램 연동 화면.
 *
 * 호스트(telegramPanel.js)가 Learning Service 응답을 그대로 실어 준다. 여기서 이름을
 * 바꾸지 않는다.
 *
 * - link  : GET  /api/v1/telegram/link       → TelegramUserLinkResponse | null(404)
 * - token : POST /api/v1/telegram/link-token → TelegramLinkTokenResponse { linkUrl, expiresAt }
 *
 * 연동 완료 판정은 서버가 한다. 404가 곧 "미연동"이므로 화면이 disconnectedAt을 다시
 * 해석하지 않는다 — 서버가 이미 해제된 연동을 404로 돌려준다.
 */

/** 발급된 링크가 실제로 만료됐는지. 서버 시각과 어긋날 수 있어 표시용으로만 쓴다. */
function isExpired(expiresAt, now) {
  if (!expiresAt) return false;
  const at = Date.parse(expiresAt);
  return Number.isFinite(at) && at <= now;
}

function formatExpiry(expiresAt) {
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function TelegramMark() {
  return (
    <span className="telegram-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="presentation" focusable="false">
        <circle cx="24" cy="24" r="24" fill="#2AABEE" />
        <path
          fill="#fff"
          d="M10.9 23.6l22-8.5c1-.4 1.9.2 1.6 1.7l-3.7 17.6c-.3 1.2-1 1.5-2 .9l-5.6-4.1-2.7 2.6c-.3.3-.6.6-1.2.6l.4-6 10.9-9.9c.5-.4-.1-.6-.7-.2l-13.5 8.5-5.8-1.8c-1.3-.4-1.3-1.3.3-1.9z"
        />
      </svg>
    </span>
  );
}

export function TelegramLink({
  link = null,
  token = null,
  loading = false,
  issuing = false,
  error = null,
  onIssue,
  onRetry,
  embedded = false
}) {
  const [copied, setCopied] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    const expiresAt = Date.parse(token?.expiresAt);
    const currentTime = Date.now();
    setClockNow(currentTime);

    if (!Number.isFinite(expiresAt) || expiresAt <= currentTime) return undefined;

    const timerId = window.setTimeout(
      () => setClockNow(Date.now()),
      expiresAt - currentTime + 50
    );
    return () => window.clearTimeout(timerId);
  }, [token?.expiresAt]);

  const linked = Boolean(link);
  const expired = Boolean(token) && isExpired(token.expiresAt, clockNow);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(token.linkUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function issue() {
    setCopied(false);
    onIssue?.();
  }

  return (
    <div className={`telegram-canvas${embedded ? " is-embedded" : ""}`}>
      {/* 제목은 호스트(대시보드 패널)가 갖는다. 여기서 머리말을 그리면 제목이 두 번 쌓인다. */}
      <section className="telegram-card" aria-label="텔레그램 연동">
        <div className="telegram-card-body" aria-live="polite" aria-busy={loading}>
          <TelegramMark />
          {renderBody()}
        </div>
      </section>
    </div>
  );

  function renderBody() {
    if (loading) {
      return <p className="telegram-status" role="status">연동 상태를 확인하는 중입니다.</p>;
    }

    if (error) {
      return (
        <>
          <p className="telegram-status is-error" role="alert">{error}</p>
          {onRetry ? (
            <button type="button" className="telegram-button" onClick={onRetry}>다시 시도</button>
          ) : null}
        </>
      );
    }

    // 이미 연동된 계정. 여기서 새 링크를 발급해도 같은 계정에 다시 붙을 뿐이라 버튼을 두지 않는다.
    if (linked) {
      return (
        <>
          <p className="telegram-status is-done">이미 등록된 사용자입니다.</p>
          <p className="telegram-hint">
            알림을 끄거나 연동을 해제하려면 텔레그램 봇에서 <code>/stop</code>,{" "}
            <code>/disconnect</code> 를 보내 주세요.
          </p>
        </>
      );
    }

    if (expired) {
      return (
        <>
          <p className="telegram-status is-expired">만료 되었습니다.</p>
          <button type="button" className="telegram-button" onClick={issue} disabled={issuing}>
            {issuing ? "발급 중…" : "재발급"}
          </button>
        </>
      );
    }

    return (
      <>
        <button type="button" className="telegram-button" onClick={issue} disabled={issuing}>
          {issuing ? "발급 중…" : "발급 받기"}
        </button>

        {token ? (
          <div className="telegram-issued">
            <input
              className="telegram-link-field"
              readOnly
              value={token.linkUrl}
              aria-label="텔레그램 연동 링크"
              onFocus={(event) => event.target.select()}
            />
            <div className="telegram-issued-actions">
              <a className="telegram-open" href={token.linkUrl} target="_blank" rel="noreferrer noopener">
                텔레그램에서 열기
              </a>
              <button type="button" className="telegram-copy" onClick={copyLink}>
                {copied ? "복사됨" : "링크 복사"}
              </button>
            </div>
            {token.expiresAt ? (
              <p className="telegram-hint">
                {formatExpiry(token.expiresAt)} 까지 유효하며 한 번만 사용할 수 있습니다.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="telegram-link-field is-placeholder" aria-hidden="true" />
        )}
      </>
    );
  }
}

export default TelegramLink;
