# 별도 검증 페르소나 브리프 (persona-designer 전용)

이 문서는 persona-designer만 읽는다. 응답자·독자·판정자에게 전달하지 않는다.
측정 영역 설명(1장)과 bio 작성 규칙(5장)은 `designer-brief.md`를 그대로 따른다. 배치 규칙(2·3장)과 정답지 형식은 이 문서를 따른다.
기존 페르소나(`personas/`, `truth/`)는 읽지 않는다. 기존 30명과 독립된 사례를 만들기 위해서다.

## 목적

V1.2에서 Core 해석 규칙을 바꾼다. 사람을 하나의 Core로 단정하지 않고 근거가 충분한 Core를 최대 3개까지 함께 설명하며, 반증은 "예상 특징이 없다"가 아니라 "특정 해석과 어긋나는 증거가 여러 상황에서 반복된다"로 판단한다.
이 15명은 새 규칙을 **조정한 뒤 고정한 상태에서만** 평가하는 별도 검증 세트다. 모집단 비율 추정이 아니라 예상하지 못한 사례에서도 규칙이 작동하는지 확인하는 것이 목적이므로, 인원수보다 사례 구성이 중요하다.

## 작성 순서

1. 인물의 삶과 장면을 먼저 쓴다(bio).
2. 그다음 그 인물에게서 기대하는 해석과 **나오면 안 되는 해석**을 truth에 적는다.
3. 특정 점수 조합을 먼저 정하고 그에 맞춰 장면을 짜지 않는다.

## 15명 구성

| id | 묶음 | 요구 사항 |
|---|---|---|
| h01–h03 | 단일 Core가 뚜렷함 | 세 중심에서 1명씩. 본능 중심(T8·T9·T1) 1, 감정 중심(T2·T3·T4) 1, 사고 중심(T5·T6·T7) 1. 다른 Core는 뚜렷하지 않음 |
| h04–h06 | 복수 Core 공존 | h04 같은 중심 안의 두 Core, h05 다른 중심의 두 Core, h06 상황에 따라 다른 Core가 앞섬(예: 일에서는 A, 가까운 관계에서는 B). 두 성향 모두 그 사람의 진짜 동기이며 하나가 다른 하나의 가면이 아님 |
| h07–h09 | 해석과 어긋나는 근거 | Core는 뚜렷하지만, 그 Core에 흔히 붙는 특정 해석 하나가 이 사람에게는 맞지 않고 여러 장면에서 반대로 행동함. 단순히 그 특징이 약한 것(지지 근거 부족)이 아니라 반대 방향의 선택이 반복되어야 함. 세 명은 서로 다른 Core와 서로 다른 해석 |
| h10–h12 | 성향으로 오인하기 쉬운 응답 | h10 문제 신호가 실제로 낮은 사람(정직하게 답하며 실제로 관계·자기평가가 안정적), h11 잘 보이고 싶어서 문제 신호를 낮게 답하는 사람(실제 장면에서는 흔들림이 보임), h12 대부분 중간값으로 답하는 습관이 있는 사람(신중함·확신 부족 등 이유를 장면으로) |
| h13–h15 | 경계 사례 | h13 두 Core가 거의 같은 힘으로 맞섬(어느 쪽이 중심이라 하기 어려움), h14 한 Core가 근소하게 앞서고 두 번째는 근거가 약함(공동 중심으로 읽으면 안 됨), h15 네 개 이상의 Core가 고르게 높음 |

- 15명의 Core 조합이 한쪽 중심이나 특정 Core에 몰리지 않게 한다. 9개 Core가 truth의 `cores`에 각각 최소 1회 등장하게 한다.
- 행동 변수(연령, 검사 동기, 집중력, 사회적 바람직성, 사전 지식, 힘든 시기, 디지털·심리용어 익숙도, 읽기 속도·컨디션·환경)는 `designer-brief.md` 3장의 항목을 쓰되 15명 안에서 다양하게 섞는다. 연령은 20대·30대·40대·50대 이상이 각각 3명 이상. 사회적 바람직성 높음은 h11 포함 2~3명.
- 자기 인식은 모두 1인칭으로 쓰고, 5명 이상은 장면과 어긋나는 맹점을 둔다.
- MBTI는 넣지 않는다(이번 검증 대상이 아님).

## 파일

- 응답자용: `holdout/personas/hNN_bio.md` — 템플릿은 `personas/_template_bio.md`의 구조와 같다(이 템플릿 파일만 읽어도 된다).
- 정답지: `holdout/truth/hNN_truth.json` — 아래 형식.
- 배치표: `holdout/truth/_matrix.md` — 15명 표와 하단 분포 집계, 6장 점검 결과.

### 정답지 형식

```json
{
  "id": "h05",
  "alias": "내부 별칭",
  "group": "coexist",
  "group_detail": "다른 중심의 두 Core 공존",
  "response_style": "normal",
  "composition": "co_center",
  "cores": [
    { "type": "T2", "role": "co_center", "evidence": "어떤 장면이 이 Core를 뒷받침하는지" },
    { "type": "T5", "role": "co_center", "evidence": "…" }
  ],
  "not_core": ["이 사람을 이 Core로 읽으면 틀린 Core와 이유"],
  "centers_note": "세 중심 분포에 대한 기대(없으면 null)",
  "expected_interpretations": ["리포트에 나와야 하는 해석을 일반 문장으로"],
  "forbidden_interpretations": ["나오면 안 되는 해석을 일반 문장으로. 예: 두 성향 중 하나를 가면이나 방어로 설명", "한쪽 Core를 반증으로 약화"],
  "contrary_evidence": [
    { "interpretation": "어긋나는 해석", "against": "반대 방향으로 반복되는 행동", "scenes": ["일", "갈등"], "why_not_just_weak": "단순히 약한 게 아니라 반대인 이유" }
  ],
  "coexistence": "두 성향이 함께 있을 수 있는 상황 설명(공존 사례가 아니면 null)",
  "response_pattern_note": "응답 방식 특이점(없으면 null)",
  "channel": "SP",
  "attachment": { "ANX": "low", "AVO": "mid" },
  "schema_top3": ["…"],
  "values_top3": ["…"],
  "state_band": "balanced",
  "stress": { "vulnerable": ["ST2"], "reactivity": "mid", "dominant_coping": ["SC3"] },
  "behavior": { "age": 0, "age_band": "30s", "motivation": "self", "focus": "mid", "reading_speed": "normal", "condition_today": "normal", "test_setting": "", "digital_literacy": "high", "psych_term_familiarity": "mid", "social_desirability": "low", "prior_knowledge": "none", "believed_core": null, "hard_period": null },
  "self_image": { "summary": "1인칭", "blind_spot": "장면과 어긋나는 점(없으면 null)" },
  "self_image_gap": { "level": "none", "description": null },
  "notes": "설계 의도"
}
```

- `composition`: `single` · `co_center` · `center_plus` · `undetermined` 중 하나. h13은 `co_center` 또는 `undetermined`, h14는 `center_plus`가 아니라 `single`일 수도 있다. 판단 근거를 `notes`에 적는다.
- `cores[].role`: `center` · `co_center` · `with`(함께 작용). 근거가 충분한 Core만 넣는다. 2위라는 이유로 넣지 않는다.
- `contrary_evidence`는 h07–h09에서 필수, 나머지는 해당될 때만.
- h11·h12는 `response_style`에 `desirable` · `midpoint`를 쓴다.

## 6. 완료 전 점검 (`holdout/truth/_matrix.md` 하단에 기록)

1. bio 금지어(`designer-brief.md` 5장) Grep 결과 0건인가
2. 공존 사례(h04–h06, h13, h15)에서 두 성향이 모두 장면으로 드러나는가(한쪽이 설명으로만 존재하지 않는가)
3. h07–h09의 반대 근거가 두 개 이상의 서로 다른 장면에서 반복되는가
4. h10과 h11을 나란히 놓았을 때, 장면만 보고 "정말 안정적인 사람"과 "안정적으로 보이고 싶은 사람"이 구분되는가
5. 15명 분포 집계(Core 등장, 중심, 연령, 동기, 사회적 바람직성, 맹점)
