# Frontend ADR

Frontend의 중요한 구조적 결정을 기록한다. 중앙 문서 저장소로 이동하기 전까지 이
디렉터리를 Frontend ADR의 작성 위치로 사용한다.

## 문서 목록

| 번호 | 상태 | 결정 |
| --- | --- | --- |
| 0003 | Accepted | [React 게임 UI 도구의 단계적 도입](0003-react-game-ui-tools-incremental-adoption.md) |

## 파일 이름

다음 문서는 번호를 증가시켜 작성한다.

```text
0004-short-decision-title.md
0005-short-decision-title.md
```

파일 이름은 `4자리 번호-영문 소문자 kebab-case.md` 형식을 사용한다. 문서 제목은
`# [ADR] 결정 제목` 형식을 사용하고 상태, 배경 및 맥락, 고려한 대안, 결정 사항 및 사유,
결과 및 영향, 규정 준수, 참고 사항 순서를 유지한다.

기존 결정을 대체할 때는 원본을 삭제하지 않고 상태를 `Deprecated/Superseded`로 바꾼 뒤
대체 ADR 번호를 참고 사항에 연결한다.
