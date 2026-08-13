import React from "react";
import { GameField } from "./GameField.jsx";

const meta = {
  title: "UI/Field",
  component: GameField,
  decorators: [(Story) => <div className="ui-story-canvas"><div style={{ width: "min(100%, 420px)" }}><Story /></div></div>],
  args: { label: "이메일", type: "email", placeholder: "name@example.com" },
  parameters: { layout: "fullscreen" }
};

export default meta;
export const Default = {};
export const WithHint = { args: { hint: "로그인에 사용할 이메일을 입력해 주세요." } };
export const Error = { args: { defaultValue: "wrong-email", error: "올바른 이메일 형식이 아닙니다." } };
export const Password = { args: { label: "비밀번호", type: "password", placeholder: "8자 이상 입력" } };
