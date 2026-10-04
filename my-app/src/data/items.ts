import type { ChoiceItem, Item, LikertItem, PartNumber, RankItem } from "../types/assessment";

/**
 * SELF-LAYERS 문항 은행 V1.2-app(검증용). 기준: project_sources/SELF-LAYERS V1.0 검사 설계서.
 * V1.0 대비 변경(Part 1 4지선다, 일부 문구)은 docs/item-bank-v1.1.md, V1.2-app의 Part 1 재배치·문장은 docs/item-bank-v1.2.md에 근거와 함께 기록한다.
 * 문항 ID는 영구 식별자이며 노출 순서(DISPLAY_ORDER)와 무관하다.
 */
export const ITEM_BANK_VERSION = "1.2-app";

export const LIKERT_LABELS = ["전혀 그렇지 않다", "그렇지 않은 편이다", "보통이다", "그런 편이다", "매우 그렇다"] as const;

export interface PartInfo { part: PartNumber; title: string; question: string; instruction: string; minutes: number }

export const PARTS: readonly PartInfo[] = [
  { part: 1, title: "선택", question: "이런 상황에서 나는 무엇을 먼저 할까요", instruction: "각 상황의 네 가지 답 중 나와 가장 가까운 답을 1순위로, 그다음으로 가까운 답을 2순위로 골라주세요. 정답은 없어요.", minutes: 9 },
  { part: 2, title: "나를 움직이는 것", question: "무엇을 잃을까 봐 그렇게 할까요", instruction: "각 문장이 지금의 나와 얼마나 가까운지 골라주세요.", minutes: 1.5 },
  { part: 3, title: "관계와 나의 규칙", question: "가까운 관계에서 나는 어떻게 반응할까요", instruction: "구체적인 장면을 떠올리며, 평소 나의 반응에 가장 가까운 답을 골라주세요. 비슷한 내용이 반대 방향으로 다시 나오기도 해요. 앞의 답과 맞추려 하지 말고 그 문장만 보고 골라주세요.", minutes: 4 },
  { part: 4, title: "흔들리는 순간", question: "무엇이 나를 흔들고, 그때 나는 무엇을 할까요", instruction: "상황 하나씩, 내가 얼마나 흔들리는지와 그때 어떻게 하는지 골라주세요.", minutes: 2.5 },
  { part: 5, title: "요즘의 나", question: "지난 한 달, 나는 어떻게 지냈나요", instruction: "성격이 아니라 지난 한 달 동안의 모습을 기준으로 답해주세요.", minutes: 1.5 },
  { part: 6, title: "하루의 만족", question: "하루를 잘 보냈다는 느낌은 언제 올까요", instruction: "딱 맞는 답이 없어도 괜찮아요. 세 가지를 나에게 가까운 순서대로 골라주세요.", minutes: 0.5 },
];

const choice = (id: string, context: ChoiceItem["context"], stem: string, a: [string, ChoiceItem["options"][0]["type"], ChoiceItem["options"][0]["value"]], b: typeof a, c: typeof a, d: typeof a): ChoiceItem => ({
  id, part: 1, kind: "choice", context, stem,
  options: [
    { key: "A", text: a[0], type: a[1], value: a[2] },
    { key: "B", text: b[0], type: b[1], value: b[2] },
    { key: "C", text: c[0], type: c[1], value: c[2] },
    { key: "D", text: d[0], type: d[1], value: d[2] },
  ],
});

/**
 * Part 1 · 4지선다(V1.2-app, 검증용). 9개 유형 각 8회 · 각 유형이 A~D 위치에 2회씩 · 문항 안 가치 중복 없음.
 * 모든 문항이 세 중심(본능 T8·T9·T1 / 감정 T2·T3·T4 / 사고 T5·T6·T7)을 2·1·1로 담는다.
 * 가치 등장: AUT·SEC 10, GROW·CONTR 8, 나머지 9. 등장 횟수 차이는 가치 보정(B안)으로 다룬다(docs/drafts/value-scoring-candidates.md).
 */

export const PART1: readonly ChoiceItem[] = [
  choice("E01", "변화", "새로운 사람들과 함께 일을 시작한 첫 주, 나는 자연스럽게 먼저", ["내가 직접 판단하고 결정할 수 있는 범위부터 확인한다", "T8", "AUT"], ["믿고 의지할 만한 사람이 누구인지 살핀다", "T6", "SEC"], ["사람들이 무엇을 필요로 하는지 살핀다", "T2", "CONTR"], ["여기서 해볼 만한 새롭고 재미있는 일이 무엇인지 둘러본다", "T7", "EXP"]),
  choice("E02", "관계", "오랜 친구가 요즘 연락이 뜸하다. 나는", ["괜히 신경 쓰기보다 하던 대로 지내며 기다린다", "T9", "SEC"], ["각자 혼자만의 시간이 필요한 때도 있다고 보고 그대로 둔다", "T5", "AUT"], ["이 관계에서 내가 진짜 바라는 게 무엇인지 생각해 본다", "T4", "AUTH"], ["사이가 달라진 건 아닌지, 최근 대화와 연락을 되짚어 본다", "T6", "REL"]),
  choice("E03", "회복", "주말에 아무 계획이 없다. 나는", ["평소 궁금했던 주제를 혼자 찾아보며 파고든다", "T5", "GROW"], ["미뤄 두었던 일 하나를 골라 끝낸다", "T3", "ACH"], ["누구에게도 맞추지 않고 내가 정한 대로 하루를 쓴다", "T8", "AUT"], ["어질러진 방과 물건을 제자리에 정리해 둔다", "T1", "SEC"]),
  choice("E04", "성과", "마감까지 하루가 남았는데 결과물이 아직 부족하다. 나는", ["막힌 부분은 전혀 다른 방식으로 새롭게 풀어 본다", "T7", "EXP"], ["나 때문에 다른 사람이 곤란해지지 않도록 필요한 것부터 챙긴다", "T2", "CONTR"], ["결과가 나오도록 일단 마무리 짓는다", "T3", "ACH"], ["내 판단으로 범위를 줄이고, 그 결정대로 밀고 나간다", "T8", "AUT"]),
  choice("E05", "갈등", "누군가 내가 한 일의 공을 가져갔다. 가장 마음에 걸리는 것은", ["내가 실제로 도움이 됐다는 사실이 묻혀 버린 점", "T2", "CONTR"], ["내가 이룬 것을 내 손으로 지켜 내지 못했다는 점", "T8", "ACH"], ["이 일로 그 사람과 사이가 어색해질 수 있다는 점", "T9", "REL"], ["앞으로 그 사람을 믿고 함께 일할 수 있을지", "T6", "SEC"]),
  choice("E06", "변화", "처음 가는 여행지에서 나는", ["그곳만의 분위기와 감정을 깊이 느끼고 싶다", "T4", "AUTH"], ["가 볼 곳을 미리 정해 두고 계획한 일정을 알차게 다 소화한다", "T3", "ACH"], ["그곳의 역사나 배경을 새로 알아 가며 둘러본다", "T5", "GROW"], ["서두르지 않고 낯선 동네의 일상 속에 천천히 섞여 보는 게 즐겁다", "T9", "EXP"]),
  choice("E07", "갈등", "회의에서 내가 동의하기 어려운 방향으로 의견이 모인다. 이때 가장 신경 쓰이는 것은", ["잘못됐다고 생각하는 부분이 고쳐지지 않은 채 넘어가는 것", "T1", "AUTH"], ["이 결정이 불러올 위험에 대비가 되어 있지 않다는 점", "T6", "SEC"], ["의견 차이로 분위기가 날카로워질 수 있다는 점", "T9", "REL"], ["이대로는 목표한 성과를 내기 어렵다는 점", "T3", "ACH"]),
  choice("E08", "성과", "큰 성과를 낸 직후, 나는", ["함께한 사람들이 얼마나 기뻐하는지부터 살핀다", "T2", "REL"], ["이번 일로 내가 어떻게 달라졌는지 혼자 되새겨 본다", "T4", "GROW"], ["이번에 생긴 여유로 안 해 본 새로운 일에 도전해 보고 싶다", "T7", "EXP"], ["한숨 돌리며 평소의 리듬대로 차분히 하루를 보낸다", "T9", "SEC"]),
  choice("E09", "관계", "가까운 사람이 내 삶의 중요한 선택에 반대한다. 나는", ["선택이 옳았다는 것을 결과로 보여 주고 싶어진다", "T3", "ACH"], ["더 부딪히지 않도록 그 이야기는 당분간 꺼내지 않는다", "T9", "REL"], ["내 선택에 혹시 놓친 위험이 있는지 다시 확인해 본다", "T6", "SEC"], ["이 선택이 정말 나다운 것인지 다시 생각해 본다", "T4", "AUTH"]),
  choice("E10", "기회", "내 재량으로 할 수 있는 새 역할이 주어졌다. 나는", ["새 역할에서도 함께하는 사람들과 편하게 호흡을 맞추고 싶다", "T9", "REL"], ["내 방식과 색깔을 담을 수 있어 좋다", "T4", "AUTH"], ["누구에게 휘둘리지 않고 내 판단대로 밀고 나갈 수 있어 좋다", "T8", "AUT"], ["해 보고 싶던 새로운 방식을 시도해 볼 수 있어 설렌다", "T7", "EXP"]),
  choice("E11", "회복", "바쁜 하루가 끝난 저녁, 나는 보통", ["오늘 아쉬웠던 점을 짚어 두고 다음엔 더 잘하자고 정리한다", "T1", "GROW"], ["평소에 안 해 본 것을 해 보며 기분을 바꾼다", "T7", "EXP"], ["혼자만의 공간에서 조용히 충전한다", "T5", "AUT"], ["남은 일 하나를 마저 끝내 두어야 마음이 놓인다", "T3", "ACH"]),
  choice("E12", "관계", "도움을 요청받았는데 내 일도 밀려 있다. 나는", ["내 일이 틀어지지 않을지부터 확인하고 대답한다", "T6", "SEC"], ["지금은 내 일이 먼저라서 어렵다고 솔직하게 말한다", "T8", "AUT"], ["대충 할 바에는 지금은 못 하겠다고 말한다", "T1", "AUTH"], ["일단 돕고 내 일은 나중에 한다", "T2", "CONTR"]),
  choice("E13", "성과", "열심히 했는데 결과가 나빴다. 가장 마음에 걸리는 것은", ["무엇을 놓쳤는지 아직 이해되지 않는다는 점", "T5", "GROW"], ["내 기준에 못 미쳤다는 사실", "T1", "AUTH"], ["내 능력이 부족해 보일 수 있다는 것", "T3", "ACH"], ["함께 애쓴 사람들에게 보탬이 되지 못했다는 것", "T2", "CONTR"]),
  choice("E14", "기회", "새로운 취미나 공부를 시작할 때 가장 끌리는 것은", ["실력이 늘었다는 것을 결과로 확인할 수 있을지", "T3", "ACH"], ["기초부터 제대로 배워 나갈 수 있을지", "T1", "GROW"], ["지금까지 해 보지 않은 것을 경험하는 재미가 있을지", "T7", "EXP"], ["누구에게 맞출 필요 없이 내 속도로 깊이 파고들 수 있을지", "T5", "AUT"]),
  choice("E15", "관계", "상대가 내 판단이나 도움을 자주 구한다. 그럴 때 먼저 드는 생각은", ["도울 수는 있지만, 어디까지 맡을지는 내가 정하고 싶다는 생각", "T8", "AUT"], ["내가 실제로 힘이 되고 있다니 다행이라는 생각", "T2", "CONTR"], ["내 판단이 틀려서 일이 잘못되면 어쩌나 하는 걱정", "T6", "SEC"], ["이 사람과 정말 마음이 통하고 있는 건지에 대한 생각", "T4", "REL"]),
  choice("E16", "미래", "5년 뒤, 내가 가장 되고 싶은 모습은", ["흔들리지 않는 안전한 기반을 가진 사람", "T6", "SEC"], ["해 보고 싶던 새로운 경험을 마음껏 해 본 사람", "T7", "EXP"], ["나를 깊이 이해하는 사람들과 진짜로 통하며 사는 사람", "T4", "REL"], ["옳다고 믿는 기준대로 살아온 사람", "T1", "AUTH"]),
  choice("E17", "변화", "잘 모르는 사람들이 많은 모임에서 나는", ["처음 보는 사람들과 이야기하는 게 즐거워 여기저기 말을 건다", "T7", "EXP"], ["특별히 나서지 않고 자연스럽게 섞인다", "T9", "REL"], ["누가 불편해 보이면 그쪽부터 살핀다", "T2", "CONTR"], ["한발 물러서 사람들의 대화를 들으며 이 모임을 알아 간다", "T5", "GROW"]),
  choice("E18", "규칙", "규칙이 불합리하다고 느낄 때 나는", ["나와 맞지 않는 규칙이라면 나다운 방식으로 해도 되는지 묻는다", "T4", "AUTH"], ["그 규칙이 왜 생겼는지 충분히 알아본 뒤에 따를지 정한다", "T5", "AUT"], ["고칠 점을 정리해 두었다가 바꿀 기회를 찾는다", "T1", "GROW"], ["나뿐 아니라 다른 사람도 손해를 본다면 직접 나서서 바꾸자고 말한다", "T8", "CONTR"]),
];

const likert = (part: LikertItem["part"], id: string, text: string, code: LikertItem["code"], reverse = false, lead?: string): LikertItem =>
  ({ id, part, kind: "likert", text, code, reverse, ...(lead ? { lead } : {}) });

export const PART2: readonly LikertItem[] = [
  likert(2, "M1", "결과보다 내가 잘못된 선택을 했다는 사실 자체가 더 견디기 어렵다.", "T1"),
  likert(2, "M2", "누군가에게 필요한 존재가 아니라고 느껴지면 내 자리가 없어진 것 같다.", "T2"),
  likert(2, "M3", "무언가를 해내고 있다는 감각이 없으면 내가 가치 없는 사람처럼 느껴진다.", "T3"),
  likert(2, "M4", "남들과 구별되는 나만의 무언가가 없다면 내가 아닌 것 같다.", "T4"),
  likert(2, "M5", "누군가 내 시간과 힘을 쓰게 될 부탁을 하면, 그만큼 내 몫이 줄어들까 봐 먼저 계산하게 된다.", "T5"),
  likert(2, "M6", "기댈 곳이 없어지는 상황이 무엇보다 불안하다.", "T6"),
  likert(2, "M7", "답답하거나 괴로운 상태에 오래 머무는 것을 견디기 어렵다.", "T7"),
  likert(2, "M8", "누군가에게 휘둘리거나 약해 보이는 것은 결코 원하지 않는다.", "T8"),
  likert(2, "M9", "내가 주장해서 관계의 평화가 깨지느니 조용히 있는 편이 낫다.", "T9"),
];

export const PART3: readonly LikertItem[] = [
  likert(3, "A1", "가까운 사람의 반응이 평소와 조금만 달라도 관계에 문제가 생긴 건 아닌지 신경 쓰인다.", "ANX"),
  likert(3, "A2", "상대의 마음이 확실하지 않으면 관계에 편안하게 머물기 어렵다.", "ANX"),
  likert(3, "A3", "중요한 사람과 연락이 닿지 않으면 그 이유를 계속 생각하게 된다.", "ANX"),
  likert(3, "A4", "상대가 바쁘거나 연락이 뜸해도 나를 소홀히 한다고 느끼지는 않는다.", "ANX", true),
  likert(3, "A5", "내 감정을 깊이 이야기하는 상황이 부담스럽다.", "AVO"),
  likert(3, "A6", "힘든 일이 생겨도 누군가에게 의지하기보다 스스로 해결하는 게 편하다.", "AVO"),
  likert(3, "A7", "누군가 나에게 지나치게 가까워지면 답답함을 느낀다.", "AVO"),
  likert(3, "A8", "힘들 때 신뢰하는 사람에게 도움이나 위로를 요청할 수 있다.", "AVO", true),
  likert(3, "S1", "아무리 가까운 관계라도 언젠가 갑자기 멀어질 수 있다고 느낀다.", "ABN"),
  likert(3, "S2", "가까운 사람과 갈등이 생겨도 관계 자체가 흔들리지는 않을 거라 생각한다.", "ABN", true),
  likert(3, "S3", "내 마음을 정말 필요한 만큼 이해해주는 사람을 만나기는 어렵다고 느낀다.", "ED"),
  likert(3, "S4", "힘들 때 내 감정을 충분히 알아주는 사람이 있다.", "ED", true),
  likert(3, "S5", "사람을 완전히 믿기 전에 그 사람의 의도를 먼저 살핀다.", "MIS"),
  likert(3, "S6", "특별히 의심할 이유가 없다면 상대의 말을 먼저 믿는 편이다.", "MIS", true),
  likert(3, "S7", "나를 깊이 알게 된 사람이 결국 실망할까 걱정될 때가 있다.", "DEF"),
  likert(3, "S8", "약점이 드러나도 그것이 나라는 사람의 가치를 낮추지는 않는다고 생각한다.", "DEF", true),
  likert(3, "S9", "중요한 결정을 혼자 내려야 할 때 내 판단이 맞는지 확신하기 어렵다.", "DEP"),
  likert(3, "S10", "처음 겪는 문제도 필요한 정보만 있으면 스스로 해결할 수 있다.", "DEP", true),
  likert(3, "S11", "내가 원하는 것을 강하게 주장하면 이기적으로 보일까 봐 불편하다.", "SS"),
  likert(3, "S12", "중요한 사람의 부탁이라도 감당하기 어렵다면 거절할 수 있다.", "SS", true),
  likert(3, "S13", "주변 사람들이 내 선택을 좋게 보지 않으면 내가 잘못 선택한 건 아닌지 생각하게 된다.", "AS"),
  likert(3, "S14", "아무도 알아주지 않아도 내가 중요하다고 생각하는 선택을 계속할 수 있다.", "AS", true),
  likert(3, "S15", "일을 잘 끝낸 뒤에도 부족했던 부분이 먼저 눈에 들어온다.", "US"),
  likert(3, "S16", "완벽하지 않아도 목적을 달성했다면 그 정도로 만족할 수 있다.", "US", true),
];

const TRIGGER_LEAD = "다음 상황이 오면 나는 평소보다 마음이 크게 흔들린다(신경이 많이 쓰이고 쉽게 가라앉지 않는다).";
const REACTIVITY_LEAD = "평소의 나는…";
const COPING_LEAD = "힘들 때 나는…";

export const PART4: readonly LikertItem[] = [
  likert(4, "ST1", "내 기준에 못 미치는 결과를 내놓아야 할 때", "ST1", false, TRIGGER_LEAD),
  likert(4, "ST2", "내가 필요 없는 사람처럼 느껴질 때", "ST2", false, TRIGGER_LEAD),
  likert(4, "ST3", "앞으로 어떻게 될지 알 수 없는 상태가 길어질 때", "ST3", false, TRIGGER_LEAD),
  likert(4, "ST4", "하고 싶지 않은 일에 묶여 선택지가 없을 때", "ST4", false, TRIGGER_LEAD),
  likert(4, "ST5", "내 의견을 말하지 못한 채 상황이 흘러갈 때", "ST5", false, TRIGGER_LEAD),
  likert(4, "ST6", "사람들 사이에 갈등이 벌어질 때", "ST6", false, TRIGGER_LEAD),
  likert(4, "SR1", "한번 마음이 흔들리면 원래 상태로 돌아오는 데 시간이 오래 걸린다.", "SR", false, REACTIVITY_LEAD),
  likert(4, "SR2", "작은 일에도 감정이 크게 요동치는 편이다.", "SR", false, REACTIVITY_LEAD),
  likert(4, "SR3", "스트레스 상황에서도 비교적 차분함을 유지하는 편이다.", "SR", true, REACTIVITY_LEAD),
  likert(4, "SC1", "일이나 할 일에 더 몰두하는 것으로 감정을 밀어둔다.", "SC1", false, COPING_LEAD),
  likert(4, "SC2", "사람들에게서 물러나 혼자 정리한다.", "SC2", false, COPING_LEAD),
  likert(4, "SC3", "누군가의 확인이나 위로를 먼저 찾는다.", "SC3", false, COPING_LEAD),
  likert(4, "SC4", "상황을 바꾸기 위해 더 강하게 밀어붙인다.", "SC4", false, COPING_LEAD),
  likert(4, "SC5", "재미있는 것이나 다른 일로 주의를 돌린다.", "SC5", false, COPING_LEAD),
  likert(4, "SC6", "무엇이 잘못됐는지 나 자신을 먼저 탓한다.", "SC6", false, COPING_LEAD),
];

const MONTH_LEAD = "지난 한 달 동안,";

export const PART5: readonly LikertItem[] = [
  likert(5, "P1", "실수했을 때 나를 몰아세우기보다 상황을 이해하려 했다.", "SC", false, MONTH_LEAD),
  likert(5, "P2", "힘든 일이 있을 때 “그럴 수도 있지” 하며 나를 다독였다.", "SC", false, MONTH_LEAD),
  likert(5, "P3", "내 부족한 점을 떠올리면 스스로에게 가혹해졌다.", "SC", true, MONTH_LEAD),
  likert(5, "P4", "불편한 감정이 있어도 내가 중요하게 여기는 일을 선택할 수 있었다.", "FLX", false, MONTH_LEAD),
  likert(5, "P5", "상황이 계획과 다르게 흘러도 방향을 조정할 수 있었다.", "FLX", false, MONTH_LEAD),
  likert(5, "P6", "어떤 걱정에 사로잡혀 하루를 보내는 날이 많았다.", "FLX", true, MONTH_LEAD),
  likert(5, "P7", "내 시간의 대부분은 내가 선택한 일로 채워졌다.", "N-AUT", false, MONTH_LEAD),
  likert(5, "P8", "내 마음을 편하게 말할 수 있는 사람이 있었다.", "N-REL", false, MONTH_LEAD),
  likert(5, "P9", "내가 하는 일에서 잘 해내고 있다는 감각이 있었다.", "N-COM", false, MONTH_LEAD),
];

export const PART6: readonly RankItem[] = [{
  id: "CH1", part: 6, kind: "rank",
  stem: "나에게 “오늘 하루 잘 보냈다”는 느낌은 주로 언제 오나요?",
  options: [
    { key: "A", text: "내 몸과 생활이 안정되고 편안했을 때", channel: "SP" },
    { key: "B", text: "사람들 속에서 내 자리가 있다고 느꼈을 때", channel: "SO" },
    { key: "C", text: "한 사람과 깊이 연결된 순간이 있었을 때", channel: "SX" },
  ],
}];

export const ITEMS: readonly Item[] = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5, ...PART6];
export const ITEM_BY_ID: ReadonlyMap<string, Item> = new Map(ITEMS.map((item) => [item.id, item]));

/**
 * 화면 노출 순서. Part 1→6 고정. Part 3은 같은 코드의 두 문항이 6문항 이상 떨어지도록 섞은 고정 순서다
 * (무작위가 아니므로 모든 사용자에게 같다).
 */
const PART3_ORDER = ["A1", "S1", "S7", "A5", "S13", "S3", "S9", "A2", "S5", "S15", "A6", "S11", "S2", "S8", "A3", "S14", "S4", "A7", "S10", "S6", "S16", "A4", "S12", "A8"];

export const DISPLAY_ORDER: readonly string[] = [
  ...PART1.map((i) => i.id),
  ...PART2.map((i) => i.id),
  ...PART3_ORDER,
  ...PART4.map((i) => i.id),
  ...PART5.map((i) => i.id),
  ...PART6.map((i) => i.id),
];

export const TOTAL_ITEMS = DISPLAY_ORDER.length;
