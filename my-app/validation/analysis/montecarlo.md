# Step 2 · 몬테카를로 기준선

엔진 v1.2-app.2 · 시드 20261001 · uniform 10000세트, 그 밖의 스타일 2000세트씩. 생성 규칙은 ASSUMPTIONS.md V4와 `scripts/generators.ts`.
무작위 응답은 실제 사람의 분포가 아니다. 여기서 보는 것은 "응답이 아무 정보도 없을 때 엔진이 어디로 기우는가"이다.

## 1. 무작위(uniform) 응답의 분포

- Primary Core: ORDER 11.4% · CARE 11.3% · DRIVE 11.6% · DEPTH 11.5% · INSIGHT 10.9% · TRUST 10.6% · SPARK 10.8% · STAND 10.9% · FLOW 11.0% (균등도 1.000, 이상값 1/9 = 11.1%)
- 판정 유보 2.2% · 강한 보조 Core 23.2% · 동기 진술 약함 33.3% · Influence 없음 13.0%
- CoreConfidence: 중앙값 55.0 (p10 37.5 – p90 71.3) · 구간 ≥70 12.3% · 55–69 38.8% · <55 49.0%
- Value Top1: ACH 12.0% · AUT 13.4% · REL 12.6% · SEC 12.4% · GROW 11.5% · AUTH 12.8% · CONTR 12.3% · EXP 13.1% (균등도 0.999, 이상값 1/8 = 12.5%)
- Value Top3 포함률: ACH 38.5% · AUT 39.2% · REL 38.6% · SEC 39.5% · GROW 38.8% · AUTH 39.2% · CONTR 39.8% · EXP 39.5% (이상값 3/8 = 37.5%)
- Schema Top1: ABN 18.2% · ED 15.5% · MIS 14.0% · DEF 13.0% · DEP 11.3% · SS 9.8% · AS 9.4% · US 8.7% (균등도 0.985)
- STATE: expansion 4.6% · balanced 61.9% · protection 33.4%
- 취약 트리거 수: 0 4.6% · 1 19.1% · 2 76.4% · 3 0.0% · 4 0.0% · 5 0.0% · 6 0.0%
- 메시지 1위 = Primary 41.5% · 메시지 1위 분포 ORDER 11.2% · CARE 10.6% · DRIVE 11.0% · DEPTH 11.2% · INSIGHT 7.8% · TRUST 7.5% · SPARK 15.4% · STAND 10.2% · FLOW 15.0%
- 강화 1개 이상 56.1% · 반증 42.0% · 응답 일관성 플래그 0.2%

### Primary Core별 강화·반증 발생률 (uniform)

| Core | n | Primary 강화 | 반증 |
|---|---:|---:|---:|
| ORDER | 1138 | 41.5% | 40.7% |
| CARE | 1132 | 36.1% | 43.7% |
| DRIVE | 1156 | 39.3% | 40.9% |
| DEPTH | 1146 | 38.3% | 44.2% |
| INSIGHT | 1094 | 30.0% | 43.8% |
| TRUST | 1060 | 20.9% | 35.8% |
| SPARK | 1085 | 38.2% | 42.3% |
| STAND | 1090 | 38.3% | 39.2% |
| FLOW | 1099 | 37.9% | 46.9% |

## 2. 응답 스타일별 비교

| 스타일 | Primary 최다 | 판정 유보 | Confidence 중앙값 | Value Top1 최다 | Schema Top1 최다 | STATE 보호 | 강화 | 반증 | 일관성 플래그 |
|---|---|---:|---:|---|---|---:|---:|---:|---:|
| uniform | DRIVE 12%, DEPTH 11% | 2.2% | 55.0 | AUT 13%, EXP 13% | ABN 18%, ED 15% | 33.4% | 56.1% | 42.0% | 0.2% |
| all3 | ORDER 13%, CARE 12% | 11.9% | 51.3 | EXP 14%, AUT 13% | ABN 100%, ED 0% | 0.0% | 0.0% | 0.0% | 0.0% |
| extreme | ORDER 12%, INSIGHT 12% | 6.6% | 53.1 | AUTH 14%, SEC 13% | ABN 30%, ED 21% | 45.6% | 51.7% | 33.6% | 63.5% |
| acquiescent | CARE 12%, SPARK 11% | 5.9% | 63.1 | AUT 14%, GROW 14% | ABN 33%, ED 21% | 0.0% | 72.2% | 14.6% | 11.9% |
| desirable | ORDER 13%, CARE 12% | 3.7% | 51.9 | AUT 14%, EXP 13% | ABN 32%, ED 22% | 0.0% | 0.0% | 100.0% | 0.0% |
| firstA | ORDER 24%, CARE 19% | 68.5% | 48.8 | AUTH 100%, ACH 0% | ABN 17%, ED 16% | 34.3% | 0.0% | 39.1% | 0.3% |
| firstB | ORDER 24%, CARE 19% | 65.4% | 48.8 | ACH 33%, AUT 33% | ABN 19%, ED 15% | 31.9% | 0.0% | 40.2% | 0.4% |
| firstC | ORDER 25%, CARE 20% | 66.3% | 48.8 | CONTR 100%, ACH 0% | ABN 17%, ED 15% | 34.3% | 0.0% | 39.2% | 0.3% |
| firstD | ORDER 24%, CARE 19% | 67.6% | 48.8 | SEC 100%, ACH 0% | ED 17%, ABN 17% | 33.2% | 0.0% | 41.3% | 0.3% |

스타일 설명: `uniform` Part 1 무작위 · 5점 1–5 균등 · Part 6 무작위 / `all3` Part 1 무작위 · 5점 전부 3 / `extreme` Part 1 무작위 · 5점 1 또는 5 / `acquiescent` Part 1 무작위 · 5점 4 또는 5 / `desirable` Part 1 무작위 · 문제 신호 1–2, 건강 문항 4–5 (사회적 바람직성) / `firstA` Part 1 항상 A→B · 5점 균등 / `firstB` Part 1 항상 B→C · 5점 균등 / `firstC` Part 1 항상 C→D · 5점 균등 / `firstD` Part 1 항상 D→A · 5점 균등

Value 코드: ACH, AUT, REL, SEC, GROW, AUTH, CONTR, EXP
