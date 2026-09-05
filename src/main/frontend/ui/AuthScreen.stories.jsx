import React from "react";
import { expect, within } from "storybook/test";
import { AuthScreen } from "./AuthScreen.jsx";

const meta = {
  title: "Patterns/AuthScreen",
  component: AuthScreen,
  parameters: { layout: "fullscreen" },
  args: { mode: "login", loading: false },
  argTypes: {
    mode: { control: "radio", options: ["login", "register", "password-reset"] },
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

export const PasswordResetEmail = {
  args: { mode: "password-reset" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("password-reset-email-step")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "인증번호 받기" })).toBeEnabled();
    await expect(canvas.getByRole("link", { name: "로그인으로 돌아가기" })).toHaveAttribute(
      "href",
      "/login"
    );
  }
};
export const PasswordResetRequestingCode = {
  args: { mode: "password-reset", emailVerification: { state: "requesting" } }
};
export const PasswordResetCodeSent = {
  args: {
    mode: "password-reset",
    emailVerification: {
      state: "sent",
      maskedEmail: "us**@example.com",
      remaining: "09:42"
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("password-reset-challenge-step")).toBeInTheDocument();
    await expect(canvas.getByLabelText("인증번호")).toBeEnabled();
    await expect(canvas.getByLabelText("새 비밀번호")).toBeEnabled();
    await expect(canvas.getByLabelText("새 비밀번호 확인")).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "비밀번호 재설정" })).toBeEnabled();
  }
};
export const PasswordResetCooldown = {
  args: {
    mode: "password-reset",
    emailVerification: { state: "cooldown", retryAfterSeconds: 37 }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "인증번호 재전송 (37초)" })
    ).toBeDisabled();
  }
};
export const PasswordResetInvalid = {
  args: {
    mode: "password-reset",
    emailVerification: { state: "invalid", remaining: "08:15" }
  }
};
export const PasswordResetExpired = {
  args: { mode: "password-reset", emailVerification: { state: "expired" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("00:00")).toBeInTheDocument();
    await expect(canvas.getByLabelText("인증번호")).toBeDisabled();
    await expect(canvas.getByLabelText("새 비밀번호")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "비밀번호 재설정" })).toBeDisabled();
  }
};
export const PasswordResetSubmitting = {
  args: { mode: "password-reset", emailVerification: { state: "submitting" } }
};
export const MobilePasswordResetCodeSent = {
  args: { mode: "password-reset", emailVerification: { state: "sent" } },
  parameters: { viewport: { defaultViewport: "mobile1" } }
};

export const HeroLogin = {
  args: { mode: "login" },
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelector(".auth-hero");
    expect(hero).not.toBeNull();

    const stage = hero.querySelector(".auth-hero-stage");
    expect(stage.getAttribute("aria-hidden")).toBe("true");
    expect(stage.querySelector("img").getAttribute("src")).toContain("study/study_eye.gif");

    expect(hero.querySelector(".auth-hero-shadow")).not.toBeNull();

    expect(hero.querySelector("h2")).toBeNull();
    expect(hero.querySelector(".ui-auth-aside-badges")).toBeNull();

    expect(hero.querySelector(".auth-hero-line").textContent).toBe("오늘도 같이 공부해요");
  }
};

export const HeroRegister = {
  args: { mode: "register" },
  play: async ({ canvasElement }) => {
    const hero = canvasElement.querySelector(".auth-hero");
    expect(hero.querySelector("img").getAttribute("src")).toContain("sprout/sprout_eye.gif");
    expect(hero.querySelector(".auth-hero-line").textContent).toBe("같이 공부할 오마고치가 기다려요");

    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(hero.querySelector("h1, h2, h3")).toBeNull();
  }
};

export const HeroNarrow = {
  args: { mode: "register" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector(".auth-hero-line");
    expect(getComputedStyle(line).display).not.toBe("none");
  }
};
