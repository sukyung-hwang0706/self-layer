# SELF-LAYERS

76문항·6 Part로 동기(CORE), 요즘의 상태(STATE), 관계(RELATIONSHIP), 반복되는 규칙(PATTERN), 흔들리는 순간(STRESS), 삶의 방향(DIRECTION)을 겹쳐 보는 자기이해 서비스 MVP입니다. 기준 문서는 `project_sources/SELF-LAYERS V1.0 검사 설계서`와 `SELF-LAYERS 결과 리포트 · SAMPLE.html`입니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

- `/` 또는 `/survey`: 검사 (인트로 → Part 1~6 → 응답 확인)
- `/result`: 결과 리포트. 제출된 응답이 없으면 안내 화면을 보여줍니다.
- `/api/narrative`: 선택형 AI 문장화. 서버 환경 변수 `ANTHROPIC_API_KEY`가 필요합니다(`.env.local`). 없으면 기본 문장만 보여줍니다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/data/items.ts` | 76문항 문항 은행, Part 정보, 노출 순서 |
| `src/data/content.ts` | 리포트 고정 문구 (Core 9종 해설, 패턴·스트레스·가치·관계 문구) |
| `src/lib/scoring.ts` | 결정론적 채점 엔진 (설계서 10장) |
| `src/lib/session.ts` | 응답 저장·복구·해시 이동 |
| `src/lib/report.ts` | 표시 구간, 문장 강도, 리포트 도우미 |
| `src/lib/narrative.ts` | AI 문장화 입력·프롬프트·출력 검증 |
| `src/app/api/narrative/route.ts` | AI 문장화 서버 경로 (서버 재채점 → Claude → 검증) |
| `src/components/survey/` | 검사 화면 |
| `src/components/report/` | 결과 리포트와 차트 |

[채점 규칙과 임시 결정](docs/scoring-decisions.md), [화면 안내](docs/survey-ui.md), [AI 문장화](docs/ai-narrative.md)를 참고하세요.

## 검증

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test          # 문항 은행·채점·세션·문구 단위 테스트
npm.cmd run test:e2e  # Playwright (모바일·데스크톱)
```
