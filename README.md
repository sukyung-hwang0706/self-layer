# SELF-LAYERS

108문항 기반 자기이해 검사 웹서비스 MVP입니다.

## 프로젝트 구조

- `my-app/`: Next.js 앱, 문항 데이터, 채점 엔진, 테스트와 개발 문서
- `project_sources/`: 문항·채점 명세 엑셀과 결과 리포트 원본 문서. 원본은 수정하지 않습니다.
- `AGENTS.md`: 프로젝트 전체 개발 지침
- `my-app/docs/work/`: 날짜별 작업보고서

## 개발 서버

프로젝트 루트에서 실행합니다.

```powershell
npm.cmd --prefix my-app ci
npm.cmd --prefix my-app run dev
```

검사 화면은 `http://localhost:3000/survey`, 결과 화면은 `/result`입니다. 결과가 없으면 검사 화면으로 이동합니다.

[앱 개발 안내](my-app/README.md)와 [검사 화면 안내](my-app/docs/survey-ui.md)를 참고하세요.

Git은 이 루트에서 앱과 원본 자료를 함께 관리합니다.
