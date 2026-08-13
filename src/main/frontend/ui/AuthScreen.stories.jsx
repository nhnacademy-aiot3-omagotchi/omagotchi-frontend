import React from "react";
import { AuthScreen } from "./AuthScreen.jsx";

const meta = {
  title: "Patterns/AuthScreen",
  component: AuthScreen,
  parameters: { layout: "fullscreen" },
  args: { mode: "login", loading: false },
  argTypes: { mode: { control: "radio", options: ["login", "register"] } }
};

export default meta;
export const Login = {};
export const LoginError = { args: { feedback: "이메일 또는 비밀번호를 다시 확인해 주세요." } };
export const LoginLoading = { args: { loading: true } };
export const Register = { args: { mode: "register" } };
export const RegisterErrors = {
  args: {
    mode: "register",
    fieldErrors: { email: "이미 사용 중인 이메일입니다.", passwordConfirm: "비밀번호가 일치하지 않습니다." }
  }
};
export const MobileLogin = { parameters: { viewport: { defaultViewport: "mobile1" } } };
export const MobileRegister = { args: { mode: "register" }, parameters: { viewport: { defaultViewport: "mobile1" } } };
