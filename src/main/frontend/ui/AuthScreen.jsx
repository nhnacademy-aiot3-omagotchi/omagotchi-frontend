import React from "react";
import { GameButton } from "./GameButton.jsx";
import { GameField } from "./GameField.jsx";

export function AuthScreen({ mode = "login", loading = false, feedback = "", fieldErrors = {} }) {
  const isRegister = mode === "register";

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

          {feedback ? <p className="ui-auth-feedback" role="alert">{feedback}</p> : null}

          <form className="ui-auth-form" onSubmit={(event) => event.preventDefault()}>
            {isRegister ? <GameField label="이름" name="name" autoComplete="name" placeholder="이름 입력" error={fieldErrors.name} /> : null}
            <GameField label="이메일" name="email" type="email" autoComplete="email" placeholder="name@example.com" error={fieldErrors.email} />
            <GameField label="비밀번호" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="8자 이상 입력" hint={isRegister ? "영문, 숫자를 조합해 8자 이상 입력해 주세요." : undefined} error={fieldErrors.password} />
            {isRegister ? <GameField label="비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" error={fieldErrors.passwordConfirm} /> : null}
            {!isRegister ? <div className="ui-auth-links"><a href="#password">비밀번호를 잊으셨나요?</a></div> : null}
            <GameButton type="submit" loading={loading}>{isRegister ? "계정 만들기" : "로그인"}</GameButton>
          </form>
        </div>
      </section>
    </main>
  );
}
