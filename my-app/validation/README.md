# SELF-LAYERS 결과 다양성 검증

가상 페르소나 30명의 블라인드 응답으로 (1) 결과가 인물을 얼마나 정확히 표현하는지, (2) 결과가 특정 쪽으로 쏠리지 않는지 살펴본다.
채점은 앱 엔진(`src/lib/scoring.ts`)을 그대로 호출하며 LLM이 점수를 만들지 않는다. 결과는 스모크 테스트이며 파일럿 데이터를 대신하지 않는다.

## 역할 분리

| 역할 | 에이전트 (`../../.claude/agents/`) | 볼 수 있는 것 | 볼 수 없는 것 |
|---|---|---|---|
| 페르소나 설계 | `persona-designer` | `designer-brief.md` | 문항, 코드, 설계서 |
| 응답 | `respondent` | `personas/pXX_bio.md` 1개, `questionnaire.md` | `truth/`, 코드, 설계서, 다른 bio |
| 채점 | 앱 엔진 (스크립트) | — | — |
| 납득도 | `persona-reader` | `personas/pXX_bio.md` 1개, `reports/pXX_run1.md` 1개 | `truth/`, 점수, 다른 사람 리포트 |
| 블라인드 판정 | `blind-judge` | `judge/trials/tNN/` | `truth/`, 점수 |
| 설계서 대조 | `spec-auditor` | `spec/design-v1.txt`, 문항 데이터 | `src/lib/` |

## 폴더

| 경로 | 내용 |
|---|---|
| `scripts/` | 검증 스크립트 (`npm.cmd run validate -- <이름>`으로 실행) |
| `spec/design-v1.txt` | 설계서 docx에서 추출한 텍스트 (파생 파일) |
| `questionnaire.md` | 응답자용 문항지. Q01~Q76, 측정 코드 없음 |
| `designer-brief.md` | 페르소나 설계 규칙과 정답지 형식 |
| `personas/` · `truth/` | 응답자용 서술 · 정답지와 배치표 `_matrix.md` (폴더 분리) |
| `responses/raw/` → `responses/` | 응답자 원출력(Q 키, run1은 `_ux.json` 응답 경험 포함) → 검증·변환된 응답(문항 ID 키) |
| `acceptance/` | 페르소나가 자기 리포트를 읽고 남긴 납득도 |
| `archive/round1/` | 1차 라운드(행동 변수·자기인식 없는 설계) 보관본 |
| `results/` · `reports/` · `judge/` · `analysis/` | 채점 결과 · 리포트 텍스트 · 판정 시행 · 지표와 대시보드 |
| `ASSUMPTIONS.md` | 검증 절차상의 가정 |

## 명령 (`my-app/`에서 실행)

| 명령 | 하는 일 |
|---|---|
| `npm.cmd run validate:spec` | 설계서 텍스트 추출 |
| `npm.cmd run validate:questionnaire` | 응답자용 문항지 생성 |
| `npm.cmd run validate:responses [필터]` | `responses/raw/*.json` 검증·변환 |

## 진행 상태

- [x] 기반: 실행기, 문항지, 설계서 텍스트, 에이전트 정의
- [x] Step 1 설계서 대조 → `analysis/engine-diff.md`, `reference-notes.md`
- [x] Step 2 몬테카를로 기준선 → `analysis/montecarlo.md`, `analysis/structure.md`
- [x] Step 3 페르소나 30명(2차: 행동 변수·자기 인식·MBTI) → `truth/_matrix.md`
- [x] Step 4 블라인드 응답 30명 × 2회 + 응답 경험
- [x] Step 5 채점·리포트 텍스트 추출
- [x] Step 6 납득도·골라내기·지표 → **`analysis/report.md`(최종 보고서)**, `analysis/metrics.md`, `analysis/dashboard.html`

### 3차: V1.1-app (Part 1 4지선다) 재검증
- [x] 2차(V1.0) 산출물을 `archive/round2-v1.0/`에 보존
- [x] 몬테카를로·문항 구조·설계서 차분 재실행 → `analysis/montecarlo.md`, `analysis/structure.md`, `analysis/engine-diff.md`
- [x] 같은 페르소나 30명 run1 재응답 → `analysis/v1.1-comparison.md`
- [ ] 납득도·골라내기 재판정(V1.1 리포트 기준) — 미실행

## 다시 돌리는 순서

1. `npm.cmd run validate:responses` → `npm.cmd run validate:score`
2. 개발 서버(`npm.cmd run dev`) 실행 중에 `npm.cmd run validate:capture`
3. `npm.cmd run validate -- make-judge-trials` → (판정 에이전트 실행) → `npm.cmd run validate:analyze`
