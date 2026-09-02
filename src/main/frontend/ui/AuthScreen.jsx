import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";

const VERIFICATION_FEEDBACK = {
  requesting: "인증번호를 보내고 있어요.",
  sent: "인증번호를 보냈습니다. 메일에서 6자리 번호를 확인해 주세요.",
  cooldown: "잠시 후 인증번호를 다시 요청해 주세요.",
  invalid: "인증 코드가 올바르지 않거나 만료되었습니다.",
  expired: "인증번호 유효 시간이 만료되었습니다. 인증번호를 재전송해 주세요.",
  submitting: "인증번호를 확인하고 계정을 생성하고 있어요."
};

export function AuthScreen({
  mode = "login",
  loading = false,
  feedback = "",
  fieldErrors = {},
  emailVerification = {}
}) {
  const isRegister = mode === "register";
  const verificationState = emailVerification.state || "details";
  const isOtpStep = isRegister && !["details", "requesting"].includes(verificationState);
  const isRequesting = verificationState === "requesting";
  const isSubmitting = verificationState === "submitting";
  const isExpired = verificationState === "expired";
  const isCooldown = verificationState === "cooldown";
  const shownFeedback = feedback || (isRegister ? VERIFICATION_FEEDBACK[verificationState] : "");
  const feedbackTone = verificationState === "sent"
    ? " is-success"
    : ["requesting", "submitting"].includes(verificationState) ? " is-neutral" : "";
  const codeError = verificationState === "invalid"
    ? "인증번호를 다시 확인해 주세요."
    : undefined;

  return (
    <main className="ui-story-canvas">
      <section className="ui-auth-shell" aria-labelledby="auth-title">
        <aside className="ui-auth-aside">
          <span className="ui-auth-brand">오마고치</span>
          <div>
            <h2>오늘의 집중을<br />캐릭터와 함께</h2>
            <p>학습 시간과 출석을 기록하고 작은 성장을 눈으로 확인해 보세요.</p>
          </div>
          <div className="ui-auth-aside-badges" aria-label="서비스 특징 해시태그">
            <span>#집중타이머</span><span>#출석기록</span><span>#캐릭터성장</span>
          </div>
        </aside>

        <div className="ui-auth-card">
          <header>
            <h1 id="auth-title">{isRegister ? "회원가입" : "다시 만나서 반가워요"}</h1>
            <p>{isRegister ? "학습을 시작할 계정을 만들어 주세요." : "계정으로 로그인하고 학습을 이어가세요."}</p>
          </header>

          <nav className="ui-auth-tabs" aria-label="인증 화면 선택">
            <a href="#login" className={`ui-auth-tab${!isRegister ? " is-active" : ""}`} aria-current={!isRegister ? "page" : undefined}>로그인</a>
            <a href="#register" className={`ui-auth-tab${isRegister ? " is-active" : ""}`} aria-current={isRegister ? "page" : undefined}>회원가입</a>
          </nav>

          {shownFeedback ? <p className={`ui-auth-feedback${feedbackTone}`} role="status">{shownFeedback}</p> : null}

          <form className="ui-auth-form" onSubmit={(event) => event.preventDefault()}>
            {!isRegister ? (
              <>
                <GameField label="이메일" name="email" type="email" autoComplete="email" placeholder="name@example.com" error={fieldErrors.email} />
                <GameField label="비밀번호" name="password" type="password" autoComplete="current-password" placeholder="8자 이상 입력" error={fieldErrors.password} />
                <div className="ui-auth-links"><a href="#password">비밀번호를 잊으셨나요?</a></div>
                <GameButton type="submit" loading={loading}>로그인</GameButton>
              </>
            ) : null}

            {isRegister && !isOtpStep ? (
              <div className="ui-email-verification" data-testid="signup-details-step">
                <GameField label="이메일" name="email" type="email" autoComplete="email" placeholder="name@example.com" error={fieldErrors.email} />
                <GameField label="이름" name="name" autoComplete="name" placeholder="이름 입력" error={fieldErrors.name} />
                <GameField label="비밀번호" name="password" type="password" autoComplete="new-password" placeholder="8자 이상 입력" hint="영문, 숫자를 조합해 8자 이상 입력해 주세요." error={fieldErrors.password} />
                <GameButton type="button" loading={isRequesting}>인증번호 받기</GameButton>
              </div>
            ) : null}

            {isOtpStep ? (
              <section className="ui-email-verification" data-testid="signup-otp-step" aria-labelledby="storybook-email-verification-title">
                <div className="ui-email-verification__summary">
                  <p id="storybook-email-verification-title">이메일로 인증번호를 보냈습니다.</p>
                  <strong>{emailVerification.maskedEmail || "us**@example.com"}</strong>
                </div>
                <GameField
                  label="인증번호"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6자리 인증번호"
                  defaultValue={verificationState === "invalid" ? "142536" : ""}
                  error={codeError}
                />
                <p className="ui-email-verification__timer">
                  남은 시간 <strong>{isExpired ? "00:00" : (emailVerification.remaining || "09:42")}</strong>
                </p>
                <GameButton type="submit" loading={isSubmitting} disabled={isExpired}>
                  인증하고 계정 만들기
                </GameButton>
                <div className="ui-email-verification__resend">
                  <span>메일이 오지 않았나요?</span>
                  <button type="button" disabled={isCooldown}>
                    {isCooldown
                      ? `인증번호 재전송 (${emailVerification.retryAfterSeconds || 37}초)`
                      : "인증번호 재전송"}
                  </button>
                </div>
                <button className="ui-email-verification__edit" type="button">이메일 및 가입 정보 수정</button>
              </section>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
