import assert from "node:assert/strict";
import { test } from "node:test";
import { DISPLAY_ORDER, ITEMS, PART1, PART2, PART3, PART4, PART5, PART6 } from "../data/items";
import { CORE_TYPES, VALUE_CODES } from "../types/assessment";

test("문항 수는 설계서 3장과 일치한다 (18+9+24+15+9+1=76, 선택지 수만 V1.1-app에서 4개로 변경)", () => {
  assert.deepEqual([PART1.length, PART2.length, PART3.length, PART4.length, PART5.length, PART6.length], [18, 9, 24, 15, 9, 1]);
  assert.equal(ITEMS.length, 76);
});

test("문항 ID는 고유하고 노출 순서는 모든 문항을 한 번씩 포함한다", () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(DISPLAY_ORDER.length, ids.length);
  assert.deepEqual([...DISPLAY_ORDER].sort(), [...ids].sort());
});

test("노출 순서는 Part 1→6을 지킨다", () => {
  const parts = DISPLAY_ORDER.map((id) => ITEMS.find((i) => i.id === id)!.part);
  assert.deepEqual(parts, [...parts].sort((a, b) => a - b));
});

test("Part 1은 4지선다(A~D)이고 한 문항 안에서 유형이 겹치지 않는다", () => {
  for (const item of PART1) {
    assert.deepEqual(item.options.map((o) => o.key), ["A", "B", "C", "D"], item.id);
    assert.equal(new Set(item.options.map((o) => o.type)).size, 4, item.id);
  }
});

test("Part 1에서 9개 유형은 각각 정확히 8회 등장한다 (V1.1-app 이후)", () => {
  for (const t of CORE_TYPES) assert.equal(PART1.flatMap((i) => i.options).filter((o) => o.type === t).length, 8, t);
});

test("Part 1 선택지 위치 균형: 각 유형은 A·B·C·D 위치에 2회씩 놓인다", () => {
  for (const t of CORE_TYPES) {
    const perPos = [0, 1, 2, 3].map((p) => PART1.filter((i) => i.options[p].type === t).length);
    assert.deepEqual(perPos, [2, 2, 2, 2], t);
  }
});

test("Part 1 Value 등장 횟수: AUT·SEC 10회, GROW·CONTR 8회, 나머지 9회 (V1.2-app, 관리 범위 8~10회)", () => {
  const expected: Record<string, number> = { AUT: 10, SEC: 10, GROW: 8, CONTR: 8 };
  for (const v of VALUE_CODES) {
    const n = PART1.flatMap((i) => i.options).filter((o) => o.value === v).length;
    assert.equal(n, expected[v] ?? 9, v);
    assert.ok(n >= 8 && n <= 10, `${v} ${n}회는 관리 범위 8~10회를 벗어난다`);
  }
});

test("Part 1 모든 문항은 세 중심(본능·감정·사고)을 2·1·1로 담는다 (V1.2-app)", () => {
  const center: Record<string, string> = { T8: "본능", T9: "본능", T1: "본능", T2: "감정", T3: "감정", T4: "감정", T5: "사고", T6: "사고", T7: "사고" };
  for (const item of PART1) {
    const counts = Object.values(item.options.reduce<Record<string, number>>((acc, o) => ({ ...acc, [center[o.type]]: (acc[center[o.type]] ?? 0) + 1 }), {}));
    assert.deepEqual(counts.sort(), [1, 1, 2], item.id);
  }
});

test("같은 문항 안에 같은 Value가 두 번 나오는 문항은 없다", () => {
  const dup = PART1.filter((i) => new Set(i.options.map((o) => o.value)).size < 4).map((i) => i.id);
  assert.deepEqual(dup, []);
});

test("Part 3 같은 코드의 문항은 노출 순서에서 6문항 이상 떨어져 있다", () => {
  const order = DISPLAY_ORDER.filter((id) => PART3.some((i) => i.id === id));
  const codeOf = (id: string) => PART3.find((i) => i.id === id)!.code;
  for (let a = 0; a < order.length; a++) for (let b = a + 1; b < order.length; b++) {
    if (codeOf(order[a]) === codeOf(order[b])) assert.ok(b - a >= 6, `${order[a]}–${order[b]} 간격 ${b - a}`);
  }
});

test("역채점 문항은 설계서 표시(R)와 같다", () => {
  const reversed = ITEMS.filter((i) => i.kind === "likert" && i.reverse).map((i) => i.id).sort();
  assert.deepEqual(reversed, ["A4", "A8", "P3", "P6", "S10", "S12", "S14", "S16", "S2", "S4", "S6", "S8", "SR3"].sort());
});

test("애착은 코드당 4문항(정3·역1), 스키마는 코드당 2문항(정1·역1)이다", () => {
  for (const code of ["ANX", "AVO"]) {
    const items = PART3.filter((i) => i.code === code);
    assert.equal(items.length, 4);
    assert.equal(items.filter((i) => i.reverse).length, 1);
  }
  for (const code of ["ABN", "ED", "MIS", "DEF", "DEP", "SS", "AS", "US"]) {
    const items = PART3.filter((i) => i.code === code);
    assert.equal(items.length, 2);
    assert.equal(items.filter((i) => i.reverse).length, 1);
  }
});
