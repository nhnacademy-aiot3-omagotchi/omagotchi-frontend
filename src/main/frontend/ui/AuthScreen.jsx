import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";

const REGISTER_VERIFICATION_FEEDBACK = {
  requesting: "인증번호를 보내고 있어요.",
  sent: "인증번호를 보냈습니다. 메일에서 6자리 번호를 확인해 주세요.",
  cooldown: "잠시 후 인증번호를 다시 요청해 주세요.",
  invalid: "인증 코드가 올바르지 않거나 만료되었습니다.",
  expired: "인증번호 유효 시간이 만료되었습니다. 인증번호를 재전송해 주세요.",
  submitting: "인증번호를 확인하고 계정을 생성하고 있어요."
};

const PASSWORD_RESET_VERIFICATION_FEEDBACK = {
  requesting: "인증번호를 보내고 있어요.",
  sent: "인증번호를 보냈습니다. 메일에서 6자리 번호를 확인해 주세요.",
  cooldown: "잠시 후 인증번호를 다시 요청해 주세요.",
  invalid: "비밀번호 재설정 정보가 올바르지 않거나 만료되었습니다.",
  expired: "인증번호 유효 시간이 만료되었습니다. 인증번호를 재전송해 주세요.",
  submitting: "인증번호를 확인하고 비밀번호를 재설정하고 있어요."
};

export function AuthScreen({
  mode = "login",
  loading = false,
  feedback = "",
  fieldErrors = {},
  emailVerification = {}
}) {
  const isRegister = mode === "register";
  const isPasswordReset = mode === "password-reset";
  const verificationState = emailVerification.state || "details";
  const hasEmailVerification = isRegister || isPasswordReset;
  const isOtpStep = hasEmailVerification
    && !["details", "requesting"].includes(verificationState);
  const isRequesting = verificationState === "requesting";
  const isSubmitting = verificationState === "submitting";
  const isExpired = verificationState === "expired";
  const isCooldown = verificationState === "cooldown";
  const verificationFeedback = isPasswordReset
    ? PASSWORD_RESET_VERIFICATION_FEEDBACK
    : REGISTER_VERIFICATION_FEEDBACK;
  const shownFeedback = feedback
    || (hasEmailVerification ? verificationFeedback[verificationState] : "");
  const feedbackTone = verificationState === "sent"
    ? " is-success"
    : ["requesting", "submitting"].includes(verificationState) ? " is-neutral" : "";
  const codeError = verificationState === "invalid"
    ? "인증번호를 다시 확인해 주세요."
    : undefined;
  const hero = isRegister
    ? {
        image: "/images/characters/sprout/sprout_eye.gif",
        line: "같이 공부할 오마고치가 기다려요"
      }
    : {
        image: "/images/characters/study/study_eye.gif",
        line: isPasswordReset ? "다시 만날 준비를 도와드릴게요" : "오늘도 같이 공부해요"
      };
  const title = isRegister
    ? "회원가입"
    : isPasswordReset ? "비밀번호 재설정" : "다시 만나서 반가워요";
  const subtitle = isRegister
    ? "학습을 시작할 계정을 만들어 주세요."
    : isPasswordReset
      ? "가입한 이메일을 입력해 주세요."
      : "계정으로 로그인하고 학습을 이어가세요.";

  return (
    <main
      className={`ui-story-canvas${isPasswordReset ? " ui-story-canvas--password-reset" : ""}`}
    >
      <section
        className={`login-card auth-card ui-auth-shell${isPasswordReset ? " password-reset-card" : ""}`}
        aria-labelledby="auth-title"
      >
        <aside className="ui-auth-aside auth-hero" aria-label="오마고치 소개">
          <a
            className="auth-back-link"
            href={isPasswordReset ? "/login" : "/"}
            aria-label={isPasswordReset ? "로그인으로 돌아가기" : "인덱스로 돌아가기"}
          >
            ←
          </a>

          <div className="auth-hero-stage" aria-hidden="true">
            <img className="auth-hero-character" src={hero.image} alt="" />
            <span className="auth-hero-shadow" />
          </div>

          <div className="auth-hero-copy">
            <p className="auth-brand ui-auth-brand">omagotchi</p>
            <p className="auth-hero-line">{hero.line}</p>
          </div>
        </aside>

        <div className="ui-auth-card">
          <header>
            <h1 id="auth-title">{title}</h1>
            <p>{subtitle}</p>
          </header>

          {!isPasswordReset ? (
            <nav className="ui-auth-tabs" aria-label="인증 화면 선택">
              <a
                href="#login"
                className={`ui-auth-tab${!isRegister ? " is-active" : ""}`}
                aria-current={!isRegister ? "page" : undefined}
              >
                로그인
              </a>
              <a
                href="#register"
                className={`ui-auth-tab${isRegister ? " is-active" : ""}`}
                aria-current={isRegister ? "page" : undefined}
              >
                회원가입
              </a>
            </nav>
          ) : null}

          {shownFeedback ? (
            <p className={`ui-auth-feedback${feedbackTone}`} role="status">
              {shownFeedback}
            </p>
          ) : null}

          <form className="ui-auth-form" onSubmit={(event) => event.preventDefault()}>
            {!hasEmailVerification ? (
              <>
                <GameField
                  label="이메일"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  error={fieldErrors.email}
                />
                <GameField
                  label="비밀번호"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="8자 이상 입력"
                  error={fieldErrors.password}
                />
                <div className="ui-auth-links">
                  <a href="/password-reset">비밀번호를 잊으셨나요?</a>
                </div>
                <GameButton type="submit" loading={loading}>로그인</GameButton>
              </>
            ) : null}

            {isRegister && !isOtpStep ? (
              <div className="ui-email-verification" data-testid="signup-details-step">
                <GameField
                  label="이메일"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  error={fieldErrors.email}
                />
                <GameField
                  label="이름"
                  name="name"
                  autoComplete="name"
                  placeholder="이름 입력"
                  error={fieldErrors.name}
                />
                <GameField
                  label="비밀번호"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8자 이상 입력"
                  hint="영문, 숫자를 조합해 8자 이상 입력해 주세요."
                  error={fieldErrors.password}
                />
                <GameButton type="button" loading={isRequesting}>인증번호 받기</GameButton>
              </div>
            ) : null}

            {isPasswordReset && !isOtpStep ? (
              <div className="ui-email-verification" data-testid="password-reset-email-step">
                <GameField
                  label="이메일"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  error={fieldErrors.email}
                />
                <GameButton type="button" loading={isRequesting}>인증번호 받기</GameButton>
                <a className="password-back-link" href="/login">로그인으로 돌아가기</a>
              </div>
            ) : null}

            {isOtpStep ? (
              <section
                className="ui-email-verification"
                data-testid={isPasswordReset ? "password-reset-challenge-step" : "signup-otp-step"}
                aria-labelledby="storybook-email-verification-title"
              >
                <div className="ui-email-verification__summary">
                  <p id="storybook-email-verification-title">
                    이메일로 인증번호를 보냈습니다.
                  </p>
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
                  disabled={isExpired}
                />
                <p className="ui-email-verification__timer">
                  남은 시간 <strong>{isExpired ? "00:00" : (emailVerification.remaining || "09:42")}</strong>
                </p>
                {isPasswordReset ? (
                  <>
                    <GameField
                      label="새 비밀번호"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="새 비밀번호"
                      hint="15~64자로 입력하고 제어 문자는 사용할 수 없습니다."
                      error={fieldErrors.newPassword}
                      disabled={isExpired}
                    />
                    <GameField
                      label="새 비밀번호 확인"
                      name="passwordConfirmation"
                      type="password"
                      autoComplete="new-password"
                      placeholder="새 비밀번호 확인"
                      error={fieldErrors.passwordConfirmation}
                      disabled={isExpired}
                    />
                  </>
                ) : null}
                <GameButton type="submit" loading={isSubmitting} disabled={isExpired}>
                  {isPasswordReset ? "비밀번호 재설정" : "인증하고 계정 만들기"}
                </GameButton>
                <div className="ui-email-verification__resend">
                  <span>메일이 오지 않았나요?</span>
                  <button type="button" disabled={isCooldown}>
                    {isCooldown
                      ? `인증번호 재전송 (${emailVerification.retryAfterSeconds || 37}초)`
                      : "인증번호 재전송"}
                  </button>
                </div>
                <button className="ui-email-verification__edit" type="button">
                  {isPasswordReset ? "이메일 수정" : "이메일 및 가입 정보 수정"}
                </button>
              </section>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
