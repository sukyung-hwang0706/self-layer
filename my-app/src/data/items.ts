import type { ChoiceItem, Item, LikertItem, PartNumber, RankItem } from "../types/assessment";

/**
 * SELF-LAYERS V1.0 문항 은행. 출처: project_sources/SELF-LAYERS V1.0 검사 설계서.
 * 문항 ID는 영구 식별자이며 노출 순서(DISPLAY_ORDER)와 무관하다.
 */
export const ITEM_BANK_VERSION = "1.0";

export const LIKERT_LABELS = ["전혀 그렇지 않다", "그렇지 않은 편이다", "보통이다", "그런 편이다", "매우 그렇다"] as const;

export interface PartInfo { part: PartNumber; title: string; question: string; instruction: string; minutes: number }

export const PARTS: readonly PartInfo[] = [
  { part: 1, title: "선택", question: "이런 상황에서 나는 무엇을 먼저 할까요", instruction: "각 상황에서 나와 가장 가까운 답을 1순위로, 그다음으로 가까운 답을 2순위로 골라주세요. 정답은 없어요.", minutes: 8 },
  { part: 2, title: "나를 움직이는 것", question: "무엇을 잃을까 봐 그렇게 할까요", instruction: "각 문장이 지금의 나와 얼마나 가까운지 골라주세요.", minutes: 1.5 },
  { part: 3, title: "관계와 나의 규칙", question: "가까운 관계에서 나는 어떻게 반응할까요", instruction: "구체적인 장면을 떠올리며, 평소 나의 반응에 가장 가까운 답을 골라주세요.", minutes: 4 },
  { part: 4, title: "흔들리는 순간", question: "무엇이 나를 흔들고, 그때 나는 무엇을 할까요", instruction: "상황 하나씩, 내가 얼마나 흔들리는지와 그때 어떻게 하는지 골라주세요.", minutes: 2.5 },
  { part: 5, title: "요즘의 나", question: "지난 한 달, 나는 어떻게 지냈나요", instruction: "성격이 아니라 지난 한 달 동안의 모습을 기준으로 답해주세요.", minutes: 1.5 },
  { part: 6, title: "하루의 만족", question: "하루를 잘 보냈다는 느낌은 언제 올까요", instruction: "세 가지를 나에게 가까운 순서대로 골라주세요.", minutes: 0.5 },
];

const choice = (id: string, context: ChoiceItem["context"], stem: string, a: [string, ChoiceItem["options"][0]["type"], ChoiceItem["options"][0]["value"]], b: typeof a, c: typeof a): ChoiceItem => ({
  id, part: 1, kind: "choice", context, stem,
  options: [
    { key: "A", text: a[0], type: a[1], value: a[2] },
    { key: "B", text: b[0], type: b[1], value: b[2] },
    { key: "C", text: c[0], type: c[1], value: c[2] },
  ],
});

export const PART1: readonly ChoiceItem[] = [
  choice("E01", "변화", "새로운 팀이나 모임에 들어간 첫 주, 나는 자연스럽게 먼저", ["이곳의 규칙과 기준이 무엇인지 파악한다", "T1", "SEC"], ["사람들이 무엇을 필요로 하는지 살핀다", "T2", "CONTR"], ["여기서 내가 무엇을 보여줄 수 있을지 생각한다", "T3", "ACH"]),
  choice("E02", "관계", "오랜 친구가 요즘 연락이 뜸하다. 나는", ["그 친구의 마음에 어떤 변화가 있는지 궁금하다", "T4", "AUTH"], ["각자 바쁜 시기라 생각하고 내 일에 집중한다", "T5", "AUT"], ["혹시 내가 서운하게 한 게 있는지 돌아본다", "T6", "SEC"]),
  choice("E03", "회복", "주말에 아무 계획이 없다. 나는", ["하고 싶었던 재미있는 일을 즉흥적으로 찾는다", "T7", "EXP"], ["누구의 방해도 없이 내 방식대로 시간을 쓴다", "T8", "AUT"], ["특별히 정하지 않고 흘러가는 대로 느긋하게 보낸다", "T9", "EXP"]),
  choice("E04", "성과", "마감 직전인데 결과물이 아직 부족하다. 나는", ["부족한 부분을 끝까지 바로잡는다", "T1", "AUTH"], ["결과가 나오도록 일단 마무리 짓는다", "T3", "ACH"], ["왜 이렇게 됐는지 원인을 짚어본다", "T5", "GROW"]),
  choice("E05", "갈등", "누군가 내가 한 일의 공을 가져갔다. 나는", ["확실하게 바로잡고 내 몫을 되찾는다", "T8", "ACH"], ["관계가 불편해질까 봐 굳이 문제 삼지 않는다", "T9", "REL"], ["내가 얼마나 애썼는지 사람들이 알아주길 바란다", "T2", "CONTR"]),
  choice("E06", "변화", "처음 가는 여행지에서 나는", ["예상 못한 경험과 새로운 것을 찾아다닌다", "T7", "EXP"], ["정보를 충분히 모아두고 움직인다", "T6", "SEC"], ["그곳만의 분위기와 감정을 깊이 느끼고 싶다", "T4", "EXP"]),
  choice("E07", "갈등", "회의에서 명백히 잘못된 결정이 내려지려 한다. 나는", ["그 자리에서 바로 반대 의견을 낸다", "T8", "AUT"], ["무엇이 왜 틀렸는지 근거를 정리해 말한다", "T1", "AUTH"], ["분위기를 해치지 않는 선에서 조심스럽게 말한다", "T9", "REL"]),
  choice("E08", "성과", "큰 성과를 낸 직후, 나는", ["바로 다음 목표를 생각한다", "T3", "ACH"], ["함께한 사람들과 기쁨을 나누고 싶다", "T2", "REL"], ["잠시 혼자 그 의미를 되새기고 싶다", "T4", "GROW"]),
  choice("E09", "관계", "가까운 사람이 내 삶의 중요한 선택에 반대한다. 나는", ["그래도 내 길을 간다", "T8", "AUTH"], ["반대하는 이유를 충분히 이해하려 한다", "T6", "SEC"], ["서로 상처받지 않는 지점을 찾는다", "T9", "REL"]),
  choice("E10", "기회", "내 재량으로 할 수 있는 새 역할이 주어졌다. 나는", ["내가 이걸 해낼 수 있다는 걸 증명하고 싶다", "T3", "ACH"], ["내 방식과 색깔을 담을 수 있어 좋다", "T4", "AUTH"], ["사람들에게 실제로 도움이 되는 방향으로 쓰고 싶다", "T2", "CONTR"]),
  choice("E11", "회복", "하루 종일 사람들에게 시달린 저녁, 나는", ["혼자만의 공간에서 조용히 충전한다", "T5", "AUT"], ["재미있는 것으로 기분을 바꾼다", "T7", "EXP"], ["편한 사람과 별말 없이 시간을 보낸다", "T9", "REL"]),
  choice("E12", "관계", "도움을 요청받았는데 내 일도 밀려 있다. 나는", ["일단 돕고 내 일은 나중에 한다", "T2", "CONTR"], ["내 일이 먼저라고 분명히 말한다", "T8", "AUT"], ["정말 급한 일인지 먼저 판단한다", "T6", "SEC"]),
  choice("E13", "성과", "열심히 했는데 결과가 나빴다. 가장 마음에 걸리는 것은", ["내 기준에 못 미쳤다는 사실", "T1", "AUTH"], ["내 능력이 부족해 보일 수 있다는 것", "T3", "ACH"], ["이 경험에서 배울 것이 무엇인지", "T5", "GROW"]),
  choice("E14", "기회", "새로운 취미나 공부를 시작할 때 가장 중요한 것은", ["얼마나 재미있을지", "T7", "EXP"], ["얼마나 깊이 제대로 알 수 있을지", "T5", "GROW"], ["이것으로 더 나은 사람이 될 수 있을지", "T1", "GROW"]),
  choice("E15", "관계", "상대가 나에게 지나치게 의지한다. 나는", ["그만큼 내가 필요한 존재라는 느낌이 싫지 않다", "T2", "REL"], ["내 자유가 줄어드는 느낌이라 부담스럽다", "T7", "AUT"], ["그 사람이 스스로 설 수 있게 선을 정해준다", "T8", "CONTR"]),
  choice("E16", "미래", "5년 뒤, 내가 가장 되고 싶은 모습은", ["원하던 것을 실제로 이룬 사람", "T3", "ACH"], ["흔들리지 않는 안전한 기반을 가진 사람", "T6", "SEC"], ["누군가에게 진짜 의미 있는 존재가 된 사람", "T4", "CONTR"]),
  choice("E17", "변화", "잘 모르는 사람들이 많은 모임에서 나는", ["특별히 나서지 않고 자연스럽게 섞인다", "T9", "REL"], ["지켜보면서 이 모임이 어떤 곳인지 파악한다", "T5", "GROW"], ["나와 진짜 통하는 사람이 있는지 찾는다", "T4", "AUTH"]),
  choice("E18", "규칙", "규칙이 불합리하다고 느낄 때 나는", ["일단 지키되 더 나은 방식을 제안한다", "T1", "GROW"], ["왜 그런 규칙이 생겼는지 이유를 알아본다", "T6", "SEC"], ["나에게 불리하면 무시하거나 돌아간다", "T7", "AUT"]),
];

const likert = (part: LikertItem["part"], id: string, text: string, code: LikertItem["code"], reverse = false, lead?: string): LikertItem =>
  ({ id, part, kind: "likert", text, code, reverse, ...(lead ? { lead } : {}) });

export const PART2: readonly LikertItem[] = [
  likert(2, "M1", "결과보다 내가 잘못된 선택을 했다는 사실 자체가 더 견디기 어렵다.", "T1"),
  likert(2, "M2", "누군가에게 필요한 존재가 아니라고 느껴지면 내 자리가 없어진 것 같다.", "T2"),
  likert(2, "M3", "무언가를 해내고 있다는 감각이 없으면 내가 가치 없는 사람처럼 느껴진다.", "T3"),
  likert(2, "M4", "남들과 구별되는 나만의 무언가가 없다면 내가 아닌 것 같다.", "T4"),
  likert(2, "M5", "내 시간과 에너지가 밖으로 빠져나가는 것을 늘 경계한다.", "T5"),
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

const TRIGGER_LEAD = "다음 상황에서 나는 평소보다 크게 흔들린다.";
const COPING_LEAD = "힘들 때 나는…";

export const PART4: readonly LikertItem[] = [
  likert(4, "ST1", "내 기준에 못 미치는 결과를 내놓아야 할 때", "ST1", false, TRIGGER_LEAD),
  likert(4, "ST2", "내가 필요 없는 사람처럼 느껴질 때", "ST2", false, TRIGGER_LEAD),
  likert(4, "ST3", "앞으로 어떻게 될지 알 수 없는 상태가 길어질 때", "ST3", false, TRIGGER_LEAD),
  likert(4, "ST4", "하고 싶지 않은 일에 묶여 선택지가 없을 때", "ST4", false, TRIGGER_LEAD),
  likert(4, "ST5", "내 의견을 말하지 못한 채 상황이 흘러갈 때", "ST5", false, TRIGGER_LEAD),
  likert(4, "ST6", "사람들 사이에 갈등이 벌어질 때", "ST6", false, TRIGGER_LEAD),
  likert(4, "SR1", "한번 마음이 흔들리면 원래 상태로 돌아오는 데 시간이 오래 걸린다.", "SR"),
  likert(4, "SR2", "작은 일에도 감정이 크게 요동치는 편이다.", "SR"),
  likert(4, "SR3", "스트레스 상황에서도 비교적 차분함을 유지하는 편이다.", "SR", true),
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
  likert(5, "P2", "힘든 감정이 올라올 때 없애려 하기보다 잠시 그대로 두었다.", "SC", false, MONTH_LEAD),
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
