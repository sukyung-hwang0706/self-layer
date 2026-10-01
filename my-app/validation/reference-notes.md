# 참조 채점기 근거 노트 (검증 Step 1)

`scripts/reference-scorer.ts`는 **설계서(`spec/design-v1.txt`)만 보고 만든 독립 구현(검증용)**이며 앱 엔진이 아니다.
앱의 `src/lib/`, `docs/scoring-decisions.md`, `src/data/content.ts`는 읽지 않았다. 입력은 `src/data/items.ts`(문항·코드·역채점)와 `src/types/assessment.ts`(타입)만 썼다.
"가정"으로 표시한 것은 설계서 원본 규칙이 아니다.

## 1. 구현한 항목과 근거

| 필드 | 식 | 근거(장·절, 인용) |
|---|---|---|
| 기초 채점 | 역문항 `6 − 응답`, `Score100 = (mean − 1)/4 × 100` | 10.1 "scored = 6 - response (reverse) … Score_{100} = (mean - 1)/4 × 100" |
| `core.raw` | 1순위 +2, 2순위 +1 | 4장 "1순위 = Core +2 / Value +2, 2순위 = +1 / +1" |
| `core.firstPicks` | 1순위로 고른 유형 횟수 | 10.2 "그래도 동점이면 1순위 선택 횟수" |
| `core.typeScore` | `raw / 12 × 100` | 10.2 "TypeScore(T_n) = TypeRaw(T_n)/12 × 100" |
| `core.motive` | M 문항 1개 → 0–100 | 5장 "각 문항 5점 척도를 0–100으로 변환해 M(Tn)으로 저장한다" |
| `core.ranking/primary/secondary` | TypeScore → M → 1순위 횟수 순 정렬, secondary = 2위 | 10.2 "Primary = TypeScore 최댓값. 동점이면 M(Tn)이 높은 쪽, 그래도 동점이면 1순위 선택 횟수" |
| `core.status/tiedWith` | 세 기준 모두 같으면 `undetermined`, tiedWith = 완전 동점 집합(Primary 포함) | 10.2 "그래도 동점이면 "혼합/판정 유보"" |
| `core.separation` | `min(100, (Top1Raw − Top2Raw)/4 × 100)` | 10.2 "CoreSeparation = min(100, (Top1Raw - Top2Raw)/4 × 100)" |
| `core.confidence` | `0.50·Top1TypeScore + 0.20·Separation + 0.30·M(Top1) − Penalty` | 10.2 "CoreConfidence = 0.50 × Top1TypeScore + 0.20 × CoreSeparation + 0.30 × M(Top1) - Penalty" |
| `core.weakMotive` | `M(Top1) < 40` | 10.2 "M(Top1) < 40이면 … 플래그를 세워" |
| `core.strongSecondary` | `M(Top2) ≥ 75` 이고 `TypeScore(Top1) − TypeScore(Top2) ≤ 8` | 10.2 "M(Top2) ≥ 75이고 TypeScore 차이가 8 이내면 Secondary를 "강한 보조 Core"로" |
| `core.channel` | 1순위 100, 2순위 50, 3순위 0, primary = 1순위 | 9장 "1순위 100, 2순위 50, 3순위 0"; 10.2 "표현 채널은 Part 6 1순위를 그대로 사용" |
| `values.capped` | 1·2순위 Value 득점, 문항당 같은 Value 최대 2점 | 4장 "문항당 같은 Value의 득점을 최대 2점으로 제한한다" |
| `attachment`, `schemas` | 코드별 역채점 평균 → 0–100 | 6장 "역문항은 6 − 응답. 코드별 평균 후 0–100 변환"; 10.3 |
| `consistency` | 해석 A(아래 3절): 역채점 후 정·역 차이 ≥ 4인 스키마, 4개 이상이면 flag | 6장 "… 스키마가 4개 이상이면 응답 일관성 플래그를 세우고 Confidence −5" |
| `stress.triggers/coping` | 문항별 0–100 | 7장 "ST·SC는 문항별 0–100 그대로 저장(합산하지 않음)" |
| `stress.reactivity` | SR 3문항(SR3 역) 평균 → 0–100 | 7장 "SR은 3문항 평균 후 0–100" |
| `stress.reactivityBand` | ≥70 high / ≥40 mid / low | 10.5 "반응성 밴드 = SR ≥ 70 높음 / 40–69 보통 / < 40 낮음" |
| `stress.vulnerable` | ST ≥ 65, 내림차순 최대 2개 | 10.5 "ST1~ST6 중 ≥ 65인 것, 최대 2개(내림차순)" |
| `stress.dominantCoping` | SC1~6 최댓값, 동점이면 모두 | 10.5 "최댓값이 2개 이상 동점이면 둘 다 표기" |
| `stress.coreMatch` | 취약 트리거의 연결 Core에 Primary 포함 여부, 취약 트리거 없으면 null | 10.5 "취약 트리거의 "연결 Core"에 Primary가 포함되면 일치"; 7장 트리거 표 |
| `state.selfCompassion/flexibility/needs` | SC = P1~P3 평균(P3 역), FLX = P4~P6 평균(P6 역), 욕구는 단일 문항 | 8장 "SC = P1~P3 평균, FLX = P4~P6 평균, 욕구 3개는 각 단일 문항. 모두 0–100" |
| `state.index` | `0.35·SC + 0.35·FLX + 0.30·mean(N-AUT, N-COM, N-REL)` | 10.4 "STATE = 0.35 × SC + 0.35 × FLX + 0.30 × mean(N_AUT, N_COM, N_REL)" |
| `state.band` | ≥70 expansion / ≥45 balanced / protection | 10.4 표 "70–100 Expansion / 45–69 Balanced / 0–44 Protection" |
| `modes.expansion` | `0.55·STATE + 0.25·(100 − SR) + 0.20·(100 − max ST)` | 10.6 "Expansion = 0.55 × STATE + 0.25 × (100 - SR) + 0.20 × (100 - max(ST_1..ST_6))" |
| `modes.protection` | `0.40·SC[stress(Core)] + 0.35·(100 − STATE) + 0.25·SR` | 10.6 "Protection = 0.40 × SC[stress(Core)] + 0.35 × (100 - STATE) + 0.25 × SR" |
| `modes.protectionCoping` | T1·T8→SC2, T2→SC4, T3·T5→SC5, T4·T9→SC3, T6→SC1, T7→SC6 | 10.6 "SC[stress(Core)]는 7장 대처 표의 매핑을 따른다"; 7장 대처 표 |
| `modes.growthDirection/stressDirection` | 2장 표 | 2장 "통합·분열 방향" 표 |
| `modes.*Band` | ≥70 high / ≥45 mid / low | 10.6 지수 밴드 표 "≥ 70 / 45–69 / < 45" |
| `growth.readiness` | `0.40·STATE + 0.35·Expansion + 0.25·N-REL` | 10.7 "GrowthReadiness = 0.40 × STATE + 0.35 × Expansion + 0.25 × N_REL" |
| `growth.band/experiments` | ≥65 → 3개, ≥45 → 2개, 그 외 0개(성찰 질문) | 10.7 "≥ 65이면 … 행동실험 3개로, 45–64면 2개, < 45면 성찰 질문 위주로" |
| `message.score` | `0.60·TypeScore(Tn) + 0.40·Resonance(n)`; Resonance T1 US, T2 SS, T3 AS, T4 DEF, T5 AVO, T6 mean(ANX, ABN), T7 ST4, T8 MIS, T9 ST5 | 10.8 "MessageScore(n) = 0.60 × TypeScore(T_n) + 0.40 × Resonance(n)" + 표 |
| `message.rank1/rank2/gap` | 1위, 2위와 차이 ≤ 8이면 rank2 | 10.8 "1위 메시지를 표시한다. 2위와 8점 이내면 두 메시지를 함께 보여준다." |
| `message.coreMatch` | rank1 === Primary | 10.8 "1위가 Primary Core의 메시지가 아니면 … 교차 통찰 페이지" |

중간값은 반올림하지 않는다. 같은 응답이면 같은 결과를 낸다(무작위·시각 의존 없음).

## 2. 구현하지 않은 항목 (설계서에 식 없음)

| 필드 | 이유 |
|---|---|
| `values.selection/diversity/contextsHit/contextsAvailable/score/ranking/top3` | 10.3 "Value는 V0.2의 ValueSelectionScore 60% + Context Diversity 40% 유지" — 두 성분의 정의식(정규화 분모, Diversity 계산)이 V1.0 설계서에 없다. 4장도 맥락 태그가 "Context Diversity 계산에 사용한다"고만 한다. |
| `core.influence` | 10.2 "Wing Influence는 V0.2 규칙 유지" — 식 없음. 11장의 "Raw 차이 ≥ 1"은 문장 강도 결정 기준일 뿐 후보 선택 규칙이 아니다. |
| `insights.reinforcements/counterevidence` | 10장 서두 "V0.2의 Reinforcement·Conflict·Compensation·Counterevidence … 규칙은 그대로 유지" — 식 없음. |
| CaseConfidence | 10.9의 RuleStrength, StrongCounterevidence, Penalty 정의가 V0.2 문서에 있고 V1.0에 없다. AssessmentResult에도 필드 없음. |
| `schemaRanking` | 11장·13장에 "스키마 top3"만 있고 동점 처리 규칙이 없다. 5점 2문항 평균이라 동점이 매우 흔해(0–100에서 9개 값) 순위가 동점 규칙에 좌우된다. |
| `version` | 참조 구현에는 앱 버전이 없다. |

## 3. 미정의·모호 지점과 택한 처리

1. **응답 일관성 기준 자기모순 (6장)** — "정·역 쌍의 응답 차이가 0 또는 1(역채점 후 기준으로 4점 이상 차이)". 원응답 차이 ≤ 1과 역채점 후 차이 ≥ 4는 같은 조건이 아니다. 원응답 (5,5)·(1,1)만 두 조건을 모두 만족하고, (3,3)·(3,4)는 원응답 기준으로만, 역채점 후 기준으로는 해당하지 않는다. 원응답 (5,4)는 역채점 후 차이 3이다.
   → **가정**: 괄호 안 "역채점 후 ≥ 4"(해석 A)를 채택한다. "보통이다"만 고른 일관된 응답이 플래그되는 것을 피하기 위해서다. 해석 B는 `inconsistentSchemasByRawGap`으로 함께 내보내 비교할 수 있게 했다.
2. **Penalty (10.2)** — CoreConfidence의 Penalty 정의가 없다. 6장 "Confidence −5"가 CoreConfidence인지 CaseConfidence인지 밝히지 않는다.
   → **가정**: Penalty = 일관성 플래그 시 5, 아니면 0. 다른 감점 요인은 없다고 본다.
3. **CoreConfidence 범위** — clamp 지시가 없다(10.9 CaseConfidence에만 clamp). → clamp하지 않는다. 계산상 −5 ~ 100 범위가 가능하다.
4. **완전 동점 처리 (10.2)** — "혼합/판정 유보"만 정하고 순위 배열 순서·Secondary·Separation을 정하지 않는다.
   → `ranking`은 T번호 순으로 동점을 나열(`AssessmentResult` 주석 관례), `status = "undetermined"`, `tiedWith`는 Primary를 포함한 동점 집합. Primary/Secondary·Separation·Confidence는 그 순서의 1·2위로 계산한다(동점이면 separation 0).
5. **Top2의 정의** — CoreSeparation의 Top2Raw, strongSecondary의 Top2를 "동점 규칙 적용 후 2위"로 본다. (Raw 기준 2위와 TypeScore 기준 2위는 같다.)
6. **취약 트리거 동점 (10.5)** — 3개 이상이 ≥ 65이고 2위 자리에 동점이 있을 때 고르는 규칙이 없다. → **가정**: ST 번호 순. 문항별 점수는 0/25/50/75/100뿐이라 "≥ 65"는 실제로 "≥ 75(응답 4·5)"와 같고 동점이 흔하다.
7. **메시지 동점 (10.8)** — 1·2위 동점 규칙이 없다. → **가정**: n(T번호) 순. 동점이면 gap 0이라 rank2가 함께 표시된다.
8. **밴드 경계의 정수 사이 값** — STATE "45–69 / 70–100", 반응성 "40–69", Growth "45–64"는 정수 경계로 쓰여 69~70, 64~65 사이 실수가 미정의다. STATE·Expansion·Protection·Growth는 실수가 된다. → **가정**: 하한 기준(≥ 70, ≥ 45, ≥ 65)으로 판정.
9. **Growth < 45의 실험 수** — "성찰 질문 위주"만 있다. → **가정**: `experiments = 0`.
10. **coreMatch 범위** — 취약 트리거가 2개일 때 하나라도 연결되면 일치로 본다(설계서는 "포함되면 일치"). 취약 트리거가 없으면 null(설계서는 "뚜렷한 취약점 없음"만 언급).
11. **Protection의 Core** — `stress(Core)`의 Core를 Primary로 본다. 판정 유보일 때의 처리는 미정의 → 정렬상 1위를 쓴다.
12. **미응답** — 부분 응답 채점 규칙이 없다. → 응답이 하나라도 없거나 형식이 틀리면 예외를 던진다.

## 4. 설계서 내부 모순·불일치

1. **문항 수** — 파일명·제목 "85문항" vs 본문 "76문항". 본문 Part 합계 18+9+24+15+9+1 = 76이 맞다.
2. **Part 수** — 3장 제목 "7개 Part, 76문항"이지만 표와 본문은 Part 1~6(6개). 초안의 Part("여유가 있을 때의 나")가 제외된 흔적으로 보인다.
3. **5점 평정 문항 수** — 3장 "나머지 57문항은 5점 평정"이지만 Part 2~5 합계는 9+24+15+9 = 57로 맞다. (Part 1·6 합 19 + 57 = 76, 일치.) 모순 아님.
4. **Value 최대 점수** — 4장 "CONTR·EXP 각 6회(최대 12점)", "ACH·AUT·REL·SEC·GROW·AUTH 각 7회(최대 14점)". 그러나 같은 4장의 "문항당 같은 Value 최대 2점" 제한 때문에 EXP는 E03·E06·E14·E11 네 문항에서만 나와 실제 최대 8점, GROW는 E14에서 두 번 나와 6문항 → 최대 12점이다. 또 "등장 횟수"를 선택지 수로 세면 EXP 6회(E03×2, E06×2, E11, E14)·GROW 7회(E14×2 포함)로 표기와 맞지만 문항 수로는 EXP 4·GROW 6이다.
5. **알려진 제약의 Value 목록** — 4장 "E03·E06·E14는 같은 문항 안에 같은 Value가 두 번 등장한다(EXP, EXP, GROW)"는 문항 데이터와 일치한다(E03 EXP×2, E06 EXP×2, E14 GROW×2).
6. **TypeScore 최대** — 각 유형 6회 등장, 1순위 +2 → 최대 12점은 데이터와 일치. 다만 같은 문항에서 한 유형은 한 번만 등장하므로 12점 달성 가능.
7. **10.6 예시 수치** — "SC3(접근) 68"은 단일 5점 문항에서 나올 수 없는 값이다(0/25/50/75/100). 산식 검산 결과(0.40×68 + 0.35×62 + 0.25×74 = 67.4)는 맞으므로 예시용 가상값으로 본다. 또 예시의 SR 74도 3문항 평균에서는 나올 수 없는 값이다(가능한 값은 100/12 간격: 66.7, 75 …).
8. **10.6 예시 밴드 문구** — Protection 67.4를 "부분 활성"으로 서술하며 표의 45–69 = "부분 활성"과 일치한다. 모순 아님.
9. **트리거 임계값 65** — 문항별 점수가 25 간격이라 65와 75 사이 값이 존재하지 않는다. 의도가 응답 4 이상인지 확인이 필요하다.
10. **ST6 연결 Core** — T2, T6, T9 세 개로 다른 트리거(1~2개)보다 많아 T2·T6·T9 Primary가 coreMatch를 얻기 쉽다(설계 의도인지 미확인).
11. **Confidence −5의 대상** — 6장은 대상 Confidence를 명시하지 않고, 10.2는 Penalty를 정의하지 않으며, 10.9 CaseConfidence에도 Penalty가 있다. 같은 −5가 두 번 적용되는지 알 수 없다.
