# Step 2 · 몬테카를로 기준선

엔진 v1.0-app.1 · 시드 20261001 · uniform 10000세트, 그 밖의 스타일 2000세트씩. 생성 규칙은 ASSUMPTIONS.md V4와 `scripts/generators.ts`.
무작위 응답은 실제 사람의 분포가 아니다. 여기서 보는 것은 "응답이 아무 정보도 없을 때 엔진이 어디로 기우는가"이다.

## 1. 무작위(uniform) 응답의 분포

- Primary Core: ORDER 11.4% · CARE 11.7% · DRIVE 11.2% · DEPTH 11.6% · INSIGHT 10.8% · TRUST 10.8% · SPARK 11.3% · STAND 10.3% · FLOW 11.1% (균등도 1.000, 이상값 1/9 = 11.1%)
- 판정 유보 3.6% · 강한 보조 Core 7.0% · 동기 진술 약함 32.8% · Influence 없음 15.0%
- CoreConfidence: 중앙값 60.0 (p10 45.0 – p90 75.8) · 구간 ≥70 20.5% · 55–69 47.3% · <55 32.2%
- Value Top1: ACH 7.4% · AUT 9.6% · REL 8.4% · SEC 8.5% · GROW 15.9% · AUTH 7.1% · CONTR 7.5% · EXP 35.7% (균등도 0.902, 이상값 1/8 = 12.5%)
- Value Top3 포함률: ACH 30.3% · AUT 34.3% · REL 31.3% · SEC 34.1% · GROW 44.1% · AUTH 30.3% · CONTR 29.1% · EXP 66.6% (이상값 3/8 = 37.5%)
- Schema Top1: ABN 17.9% · ED 15.6% · MIS 13.8% · DEF 12.7% · DEP 11.5% · SS 10.6% · AS 9.6% · US 8.3% (균등도 0.987)
- STATE: expansion 4.8% · balanced 61.6% · protection 33.6%
- 취약 트리거 수: 0 4.8% · 1 18.1% · 2 77.0% · 3 0.0% · 4 0.0% · 5 0.0% · 6 0.0%
- 메시지 1위 = Primary 43.5% · 메시지 1위 분포 ORDER 12.5% · CARE 12.3% · DRIVE 11.8% · DEPTH 10.5% · INSIGHT 8.2% · TRUST 7.9% · SPARK 14.1% · STAND 9.4% · FLOW 13.3%
- 강화 1개 이상 60.6% · 반증 40.9% · 응답 일관성 플래그 0.1%

### Primary Core별 강화·반증 발생률 (uniform)

| Core | n | Primary 강화 | 반증 |
|---|---:|---:|---:|
| ORDER | 1137 | 41.2% | 41.2% |
| CARE | 1166 | 40.1% | 39.8% |
| DRIVE | 1115 | 41.2% | 40.8% |
| DEPTH | 1161 | 37.7% | 45.2% |
| INSIGHT | 1080 | 31.4% | 40.5% |
| TRUST | 1077 | 24.6% | 32.2% |
| SPARK | 1128 | 37.7% | 42.8% |
| STAND | 1029 | 38.5% | 41.5% |
| FLOW | 1107 | 39.6% | 43.3% |

## 2. 응답 스타일별 비교

| 스타일 | Primary 최다 | 판정 유보 | Confidence 중앙값 | Value Top1 최다 | Schema Top1 최다 | STATE 보호 | 강화 | 반증 | 일관성 플래그 |
|---|---|---:|---:|---|---|---:|---:|---:|---:|
| uniform | CARE 12%, DEPTH 12% | 3.6% | 60.0 | EXP 36%, GROW 16% | ABN 18%, ED 16% | 33.6% | 60.6% | 40.9% | 0.1% |
| all3 | ORDER 13%, DEPTH 13% | 14.9% | 57.5 | EXP 37%, GROW 15% | ABN 100%, ED 0% | 0.0% | 0.0% | 0.0% | 0.0% |
| extreme | DEPTH 12%, DRIVE 11% | 8.6% | 60.8 | EXP 35%, GROW 17% | ABN 34%, ED 19% | 45.3% | 54.5% | 33.1% | 62.9% |
| acquiescent | ORDER 13%, CARE 12% | 8.5% | 68.3 | EXP 37%, GROW 16% | ABN 31%, ED 20% | 0.0% | 75.5% | 14.9% | 10.7% |
| desirable | CARE 13%, DRIVE 12% | 5.0% | 57.5 | EXP 37%, GROW 15% | ABN 33%, ED 20% | 0.0% | 0.0% | 100.0% | 0.0% |
| firstA | ORDER 100%, CARE 0% | 0.0% | 57.5 | EXP 100%, ACH 0% | ABN 17%, ED 16% | 34.3% | 64.3% | 40.1% | 0.3% |
| firstB | TRUST 100%, ORDER 0% | 0.0% | 66.7 | SEC 100%, ACH 0% | ABN 19%, ED 15% | 31.9% | 47.3% | 33.9% | 0.4% |
| firstC | DEPTH 59%, FLOW 41% | 20.0% | 60.0 | EXP 100%, ACH 0% | ABN 17%, ED 15% | 34.3% | 64.1% | 44.5% | 0.3% |

스타일 설명: `uniform` Part 1 무작위 · 5점 1–5 균등 · Part 6 무작위 / `all3` Part 1 무작위 · 5점 전부 3 / `extreme` Part 1 무작위 · 5점 1 또는 5 / `acquiescent` Part 1 무작위 · 5점 4 또는 5 / `desirable` Part 1 무작위 · 문제 신호 1–2, 건강 문항 4–5 (사회적 바람직성) / `firstA` Part 1 항상 A→B · 5점 균등 / `firstB` Part 1 항상 B→C · 5점 균등 / `firstC` Part 1 항상 C→A · 5점 균등

Value 코드: ACH, AUT, REL, SEC, GROW, AUTH, CONTR, EXP
