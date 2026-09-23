import assert from "node:assert/strict";
import { test } from "node:test";
import { DISPLAY_ORDER, ITEMS, PART1, PART2, PART3, PART4, PART5, PART6 } from "../data/items";
import { CORE_TYPES, VALUE_CODES } from "../types/assessment";

test("문항 수는 설계서 3장과 일치한다 (18+9+24+15+9+1=76)", () => {
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

test("Part 1에서 9개 유형은 각각 정확히 6회 등장한다", () => {
  for (const t of CORE_TYPES) assert.equal(PART1.flatMap((i) => i.options).filter((o) => o.type === t).length, 6, t);
});

test("Part 1 Value 등장 횟수는 설계서와 같다 (CONTR·EXP 6회, 나머지 7회)", () => {
  for (const v of VALUE_CODES) {
    const n = PART1.flatMap((i) => i.options).filter((o) => o.value === v).length;
    assert.equal(n, v === "CONTR" || v === "EXP" ? 6 : 7, v);
  }
});

test("같은 문항 안에 같은 Value가 두 번 나오는 문항은 E03·E06·E14뿐이다", () => {
  const dup = PART1.filter((i) => new Set(i.options.map((o) => o.value)).size < 3).map((i) => i.id);
  assert.deepEqual(dup, ["E03", "E06", "E14"]);
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
