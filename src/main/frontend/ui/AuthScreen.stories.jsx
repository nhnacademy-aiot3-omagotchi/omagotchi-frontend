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
