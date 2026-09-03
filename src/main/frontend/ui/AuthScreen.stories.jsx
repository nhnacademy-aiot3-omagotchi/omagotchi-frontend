import React from "react";
import { expect, within } from "storybook/test";
import { AuthScreen } from "./AuthScreen.jsx";

const meta = {
  title: "Patterns/AuthScreen",
  component: AuthScreen,
  parameters: { layout: "fullscreen" },
  args: { mode: "login", loading: false },
  argTypes: {
    mode: { control: "radio", options: ["login", "register"] },
    emailVerification: { control: "object" }
  }
};

export default meta;
export const Login = {};
export const LoginError = { args: { feedback: "이메일 또는 비밀번호를 다시 확인해 주세요." } };
export const LoginLoading = { args: { loading: true } };
export const Register = { args: { mode: "register" } };
export const RegisterErrors = {
  args: {
    mode: "register",
    fieldErrors: { email: "이미 사용 중인 이메일입니다.", password: "비밀번호 정책을 확인해 주세요." }
  }
};
export const RegisterRequestingCode = {
  args: { mode: "register", emailVerification: { state: "requesting" } }
};
export const RegisterCodeSent = {
  args: { mode: "register", emailVerification: { state: "sent", maskedEmail: "us**@example.com", remaining: "09:42" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("signup-otp-step")).toBeInTheDocument();
    await expect(canvas.getByText("메일이 오지 않았나요?")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "인증번호 재전송" })).toBeEnabled();
  }
};
export const RegisterResendCooldown = {
  args: { mode: "register", emailVerification: { state: "cooldown", retryAfterSeconds: 37 } }
};
export const RegisterInvalidCode = {
  args: { mode: "register", emailVerification: { state: "invalid", remaining: "08:15" } }
};
export const RegisterExpiredCode = {
  args: { mode: "register", emailVerification: { state: "expired" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("00:00")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "인증하고 계정 만들기" })).toBeDisabled();
  }
};
export const RegisterSubmitting = {
  args: { mode: "register", emailVerification: { state: "submitting" } }
};
export const MobileLogin = { parameters: { viewport: { defaultViewport: "mobile1" } } };
export const MobileRegisterCodeSent = {
  args: { mode: "register", emailVerification: { state: "sent" } },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};

/* ── 좌측 히어로 ───────────────────────────────────────────────────
 * 예전에는 큰 제목 두 줄 + 설명 + 해시태그 배지였다. 픽셀 폰트가 좁은 폭에서
 * "새로운 학습 여 / 정을" 처럼 끊기고 아래 절반이 비어서, 캐릭터 하나와 한 줄로 줄였다.
 */

/** 로그인 히어로 — 공부쟁이. */
export const HeroLogin = {
  args: { mode: "login" },
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelector(".auth-hero");
    expect(hero).not.toBeNull();

    // 캐릭터는 장식이라 보조기기에서 감춘다.
    const stage = hero.querySelector(".auth-hero-stage");
    expect(stage.getAttribute("aria-hidden")).toBe("true");
    expect(stage.querySelector("img").getAttribute("src")).toContain("study/study_eye.gif");

    // 떠 있는 느낌은 캐릭터와 그림자가 함께 움직여야 나온다.
    expect(hero.querySelector(".auth-hero-shadow")).not.toBeNull();

    // 옛 요소는 남아 있으면 안 된다.
    expect(hero.querySelector("h2")).toBeNull();
    expect(hero.querySelector(".ui-auth-aside-badges")).toBeNull();

    // 문구는 한 줄만.
    expect(hero.querySelector(".auth-hero-line").textContent).toBe("오늘도 같이 공부해요");
  }
};

/** 회원가입 히어로 — 새싹이. 시작하는 화면에 맞췄다. */
export const HeroRegister = {
  args: { mode: "register" },
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelector(".auth-hero");
    expect(hero.querySelector("img").getAttribute("src")).toContain("sprout/sprout_eye.gif");
    expect(hero.querySelector(".auth-hero-line").textContent).toBe("같이 공부할 오마고치가 기다려요");

    // 페이지 제목은 히어로가 아니라 오른쪽 폼이 갖는다. 접근성 참조가 여기 걸려 있다.
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(hero.querySelector("h1, h2, h3")).toBeNull();
  }
};

/** 좁은 화면. 문구가 사라지지 않아야 한다. */
export const HeroNarrow = {
  args: { mode: "register" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector(".auth-hero-line");
    // design-system.css 가 좁은 화면에서 .ui-auth-aside p 를 숨기는데,
    // :not(.auth-hero) 로 한정하지 않으면 이 한 줄까지 사라진다.
    expect(getComputedStyle(line).display).not.toBe("none");
  }
};
