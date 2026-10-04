# Step 2 · 몬테카를로 기준선

엔진 v1.1-app.1 · 시드 20261001 · uniform 10000세트, 그 밖의 스타일 2000세트씩. 생성 규칙은 ASSUMPTIONS.md V4와 `scripts/generators.ts`.
무작위 응답은 실제 사람의 분포가 아니다. 여기서 보는 것은 "응답이 아무 정보도 없을 때 엔진이 어디로 기우는가"이다.

## 1. 무작위(uniform) 응답의 분포

- Primary Core: ORDER 11.4% · CARE 11.4% · DRIVE 11.2% · DEPTH 11.3% · INSIGHT 11.6% · TRUST 11.3% · SPARK 10.8% · STAND 10.5% · FLOW 10.5% (균등도 1.000, 이상값 1/9 = 11.1%)
- 판정 유보 2.3% · 강한 보조 Core 23.3% · 동기 진술 약함 34.2% · Influence 없음 13.0%
- CoreConfidence: 중앙값 54.4 (p10 37.5 – p90 71.3) · 구간 ≥70 11.6% · 55–69 37.8% · <55 50.5%
- Value Top1: ACH 10.9% · AUT 12.9% · REL 14.4% · SEC 11.1% · GROW 10.6% · AUTH 19.3% · CONTR 9.0% · EXP 12.0% (균등도 0.987, 이상값 1/8 = 12.5%)
- Value Top3 포함률: ACH 34.9% · AUT 38.8% · REL 42.0% · SEC 34.3% · GROW 33.7% · AUTH 50.0% · CONTR 30.2% · EXP 36.2% (이상값 3/8 = 37.5%)
- Schema Top1: ABN 18.2% · ED 15.5% · MIS 14.0% · DEF 13.0% · DEP 11.3% · SS 9.8% · AS 9.4% · US 8.7% (균등도 0.985)
- STATE: expansion 4.6% · balanced 61.9% · protection 33.4%
- 취약 트리거 수: 0 4.6% · 1 19.1% · 2 76.4% · 3 0.0% · 4 0.0% · 5 0.0% · 6 0.0%
- 메시지 1위 = Primary 41.1% · 메시지 1위 분포 ORDER 11.5% · CARE 10.7% · DRIVE 10.8% · DEPTH 11.1% · INSIGHT 7.8% · TRUST 7.5% · SPARK 15.7% · STAND 9.8% · FLOW 15.0%
- 강화 1개 이상 56.0% · 반증 41.1% · 응답 일관성 플래그 0.2%

### Primary Core별 강화·반증 발생률 (uniform)

| Core | n | Primary 강화 | 반증 |
|---|---:|---:|---:|
| ORDER | 1143 | 39.2% | 39.9% |
| CARE | 1144 | 39.4% | 39.8% |
| DRIVE | 1117 | 38.4% | 41.7% |
| DEPTH | 1126 | 37.5% | 45.3% |
| INSIGHT | 1155 | 29.5% | 43.5% |
| TRUST | 1129 | 23.3% | 33.9% |
| SPARK | 1082 | 37.8% | 41.7% |
| STAND | 1053 | 36.6% | 41.4% |
| FLOW | 1051 | 41.0% | 43.3% |

## 2. 응답 스타일별 비교

| 스타일 | Primary 최다 | 판정 유보 | Confidence 중앙값 | Value Top1 최다 | Schema Top1 최다 | STATE 보호 | 강화 | 반증 | 일관성 플래그 |
|---|---|---:|---:|---|---|---:|---:|---:|---:|
| uniform | INSIGHT 12%, CARE 11% | 2.3% | 54.4 | AUTH 19%, REL 14% | ABN 18%, ED 15% | 33.4% | 56.0% | 41.1% | 0.2% |
| all3 | DEPTH 12%, ORDER 12% | 11.2% | 51.3 | AUTH 18%, REL 14% | ABN 100%, ED 0% | 0.0% | 0.0% | 0.0% | 0.0% |
| extreme | DRIVE 13%, INSIGHT 12% | 5.5% | 53.1 | AUTH 20%, REL 14% | ABN 30%, ED 21% | 45.6% | 51.4% | 32.3% | 63.5% |
| acquiescent | ORDER 12%, FLOW 12% | 5.1% | 63.1 | AUTH 19%, REL 16% | ABN 33%, ED 21% | 0.0% | 72.9% | 15.7% | 11.9% |
| desirable | ORDER 12%, CARE 12% | 4.0% | 51.9 | AUTH 19%, REL 15% | ABN 32%, ED 22% | 0.0% | 0.0% | 100.0% | 0.0% |
| firstA | ORDER 24%, CARE 19% | 68.5% | 48.8 | REL 100%, ACH 0% | ABN 17%, ED 16% | 34.3% | 0.0% | 39.1% | 0.3% |
| firstB | ORDER 24%, CARE 19% | 65.4% | 48.8 | REL 100%, ACH 0% | ABN 19%, ED 15% | 31.9% | 0.0% | 40.2% | 0.4% |
| firstC | ORDER 25%, CARE 20% | 66.3% | 48.8 | AUTH 100%, ACH 0% | ABN 17%, ED 15% | 34.3% | 0.0% | 39.2% | 0.3% |
| firstD | ORDER 24%, CARE 19% | 67.6% | 48.8 | AUTH 100%, ACH 0% | ED 17%, ABN 17% | 33.2% | 0.0% | 41.3% | 0.3% |

스타일 설명: `uniform` Part 1 무작위 · 5점 1–5 균등 · Part 6 무작위 / `all3` Part 1 무작위 · 5점 전부 3 / `extreme` Part 1 무작위 · 5점 1 또는 5 / `acquiescent` Part 1 무작위 · 5점 4 또는 5 / `desirable` Part 1 무작위 · 문제 신호 1–2, 건강 문항 4–5 (사회적 바람직성) / `firstA` Part 1 항상 A→B · 5점 균등 / `firstB` Part 1 항상 B→C · 5점 균등 / `firstC` Part 1 항상 C→D · 5점 균등 / `firstD` Part 1 항상 D→A · 5점 균등

Value 코드: ACH, AUT, REL, SEC, GROW, AUTH, CONTR, EXP
