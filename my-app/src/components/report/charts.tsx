import type { CSSProperties, ReactNode } from "react";
import { r } from "../../lib/report";

const LAYER_VAR: Record<string, string> = { core: "var(--core)", state: "var(--state)", rel: "var(--rel)", pat: "var(--pat)", str: "var(--str)", dir: "var(--dir)" };

export interface BarRow { name: string; value: number; strong?: boolean; muted?: boolean; dots?: [number, number] }

/** 텍스트 이름과 점수를 함께 보여주는 막대 목록. bands면 낮음·중간·다소 높음·높음 띠를 깐다. */
export function BarList({ rows, bands, label }: { rows: BarRow[]; bands?: boolean; label: string }) {
  return <div>
    <ul className={`bars${bands ? " bands" : ""}`} aria-label={label} style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map((row) => <li key={row.name} className="bar">
        <span className={`name${row.strong ? " strong" : ""}`}>{row.name}</span>
        <span className="track" aria-hidden="true"><span className={`fill${row.muted ? " muted" : ""}`} style={{ width: `${Math.max(2, row.value)}%` }} /></span>
        <span className="val">{r(row.value)}</span>
        {row.dots && <span className="dots" aria-label={`${row.dots[1]}종류 상황 중 ${row.dots[0]}종류에서 선택`}>
          {Array.from({ length: row.dots[1] }, (_, i) => <i key={i} className={i < row.dots![0] ? "on" : ""} />)}
        </span>}
      </li>)}
    </ul>
    {bands && <div className="band-legend" aria-hidden="true"><span /><div>
      <span style={{ width: "40%" }}>낮음</span><span style={{ width: "20%" }}>중간</span><span style={{ width: "15%" }}>다소 높음</span><span style={{ width: "25%" }}>높음</span>
    </div><span /></div>}
  </div>;
}

export interface RadarAxis { key: string; label: string; score: number; layer?: string }

/** 6축 레이더. 축 이름은 짧게 두고 자세한 값은 곁의 텍스트 범례로 보여준다. */
export function Radar({ axes, color, threshold, ariaLabel }: { axes: readonly RadarAxis[]; color: string; threshold?: number; ariaLabel: string }) {
  const cx = 200, cy = 190, R = 130, n = axes.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * v / 100, cy + Math.sin(a) * R * v / 100] as const;
  };
  const ring = (v: number) => axes.map((_, i) => pt(i, v).join(",")).join(" ");
  return <svg viewBox="-125 0 650 380" role="img" aria-label={ariaLabel}>
    <g stroke="var(--line)" fill="none" strokeWidth="1">
      {[100, 75, 50, 25].map((v) => <polygon key={v} points={ring(v)} />)}
      {axes.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />; })}
    </g>
    {threshold !== undefined && <polygon points={ring(threshold)} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="5 4" opacity=".7" />}
    <polygon points={axes.map((a, i) => pt(i, a.score).join(",")).join(" ")} fill={color} fillOpacity=".15" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    {axes.map((a, i) => { const [x, y] = pt(i, a.score); return <circle key={a.key} cx={x} cy={y} r="5.5" fill={a.layer ? LAYER_VAR[a.layer] : color} />; })}
    {axes.map((a, i) => {
      const [x, y] = pt(i, 122);
      const anchor = Math.abs(x - cx) < 5 ? "middle" : x > cx ? "start" : "end";
      return <text key={a.key} x={x} y={y + 5} textAnchor={anchor} fontSize="15" fill="var(--ink)" fontFamily="var(--sans)">
        <tspan fill="var(--ink-2)">{a.label} </tspan><tspan fontWeight="700" fill={a.layer ? LAYER_VAR[a.layer] : color}>{r(a.score)}</tspan>
      </text>;
    })}
  </svg>;
}

/** STATE 반원 게이지: 0–44 보호 · 45–69 평소 · 70–100 여유 */
export function StateGauge({ value }: { value: number }) {
  const cx = 160, cy = 150, R = 118;
  const at = (v: number) => { const a = Math.PI * (1 - v / 100); return [cx + Math.cos(a) * R, cy - Math.sin(a) * R] as const; };
  const arc = (from: number, to: number) => { const [x1, y1] = at(from), [x2, y2] = at(to); return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`; };
  const [nx, ny] = at(Math.min(100, Math.max(0, value)));
  const needle = [cx + (nx - cx) * 0.78, cy + (ny - cy) * 0.78];
  return <svg viewBox="0 0 320 200" role="img" aria-label={`현재 상태 지수 ${r(value)}점`}>
    <path d={arc(0, 45)} fill="none" stroke="var(--band-prot)" strokeWidth="24" />
    <path d={arc(45, 70)} fill="none" stroke="var(--band-bal)" strokeWidth="24" />
    <path d={arc(70, 100)} fill="none" stroke="var(--band-exp)" strokeWidth="24" />
    <line x1={cx} y1={cy} x2={needle[0]} y2={needle[1]} stroke="var(--state)" strokeWidth="4" strokeLinecap="round" />
    <circle cx={cx} cy={cy} r="8" fill="var(--state)" />
    <text x={cx} y={cy - 34} textAnchor="middle" fontSize="36" fontWeight="700" fill="var(--state)">{r(value)}</text>
    <g fontSize="13" fill="var(--ink-2)" fontFamily="var(--sans)">
      <text x="30" y="188" textAnchor="middle">보호</text>
      <text x={cx} y="18" textAnchor="middle">평소의 나</text>
      <text x="290" y="188" textAnchor="middle">여유</text>
    </g>
  </svg>;
}

/** Protection ← | → Expansion 양방향 막대. 두 지수는 서로 독립이다. */
export function ModesBar({ protection, expansion }: { protection: number; expansion: number }) {
  const side = (v: number, color: string, dir: "l" | "r"): CSSProperties => ({ position: "absolute", top: 0, bottom: 0, [dir === "l" ? "right" : "left"]: 0, width: `${v}%`, background: color, borderRadius: 11 });
  return <div role="img" aria-label={`Protection 지수 ${r(protection)}, Expansion 지수 ${r(expansion)}`}>
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
      <span style={{ color: "var(--str)" }}>Protection Mode</span><span style={{ color: "var(--state)" }}>Expansion Mode</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2px 1fr", alignItems: "center", margin: "10px 0 6px" }}>
      <div style={{ position: "relative", height: 22, background: "var(--band-prot)", borderRadius: 11 }}><span style={side(protection, "var(--str)", "l")} /></div>
      <div style={{ height: 36, background: "var(--ink)" }} />
      <div style={{ position: "relative", height: 22, background: "var(--band-exp)", borderRadius: 11 }}><span style={side(expansion, "var(--state)", "r")} /></div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 700 }}>
      <span style={{ color: "var(--str)" }}>{r(protection)}</span><span style={{ color: "var(--state)" }}>{r(expansion)}</span>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--ink-3)" }}>
      <span>스트레스 방향의 대처가 켜진 정도</span><span style={{ textAlign: "right" }}>여유 · 회복 · 낮은 흔들림</span>
    </div>
  </div>;
}

/** 관계 지도: 가로 = 친밀감 거리두기(AVO), 세로 = 관계 변화 민감도(ANX) */
export function Quadrant({ anx, avo, labels }: { anx: number; avo: number; labels: [string, string, string, string] }) {
  const x0 = 40, y0 = 10, S = 270, px = x0 + (avo / 100) * S, py = y0 + (1 - anx / 100) * S;
  return <svg viewBox="0 0 330 330" role="img" aria-label={`관계 지도: 관계 변화 민감도 ${r(anx)}, 친밀감 거리두기 ${r(avo)}`}>
    <rect x={x0} y={y0} width={S / 2} height={S / 2} fill="var(--rel-soft)" />
    <rect x={x0 + S / 2} y={y0} width={S / 2} height={S / 2} fill="var(--rel-soft)" opacity=".55" />
    <rect x={x0} y={y0 + S / 2} width={S / 2} height={S / 2} fill="var(--state-soft)" />
    <rect x={x0 + S / 2} y={y0 + S / 2} width={S / 2} height={S / 2} fill="var(--rel-soft)" opacity=".55" />
    <rect x={x0} y={y0} width={S} height={S} fill="none" stroke="var(--line)" />
    <g fontSize="12" fill="var(--ink-2)" textAnchor="middle" fontFamily="var(--sans)">
      <text x={x0 + S / 4} y={y0 + 22}>{labels[0]}</text>
      <text x={x0 + 3 * S / 4} y={y0 + 22}>{labels[1]}</text>
      <text x={x0 + S / 4} y={y0 + S - 12}>{labels[2]}</text>
      <text x={x0 + 3 * S / 4} y={y0 + S - 12}>{labels[3]}</text>
      <text x={x0 + S / 2} y={y0 + S + 26}>친밀감 거리두기 →</text>
      <text x="18" y={y0 + S / 2} transform={`rotate(-90 18 ${y0 + S / 2})`}>관계 변화 민감도 →</text>
    </g>
    <circle cx={px} cy={py} r="13" fill="var(--rel)" opacity=".22" />
    <circle cx={px} cy={py} r="6.5" fill="var(--rel)" />
    <text x={px + (px > x0 + S - 40 ? -14 : 14)} y={py - 10} textAnchor={px > x0 + S - 40 ? "end" : "start"} fontSize="14" fontWeight="700" fill="var(--rel)">나</text>
  </svg>;
}

/** 강화 조합: 두 Layer가 같은 방향으로 겹치는 정도 */
export function Venn({ left, right, strength }: { left: { title: string; label: string }; right: { title: string; label: string }; strength: number }) {
  return <svg viewBox="0 0 340 190" role="img" aria-label={`${left.label}와 ${right.label}의 겹침 강도 ${r(strength)}`}>
    <circle cx="125" cy="95" r="80" fill="var(--core)" fillOpacity=".16" stroke="var(--core)" strokeWidth="1.5" />
    <circle cx="215" cy="95" r="80" fill="var(--pat)" fillOpacity=".16" stroke="var(--pat)" strokeWidth="1.5" />
    <g fontFamily="var(--sans)" textAnchor="middle">
      <text x="88" y="88" fontSize="13" fontWeight="700" fill="var(--core)">{left.title}</text>
      <text x="88" y="108" fontSize="12.5" fill="var(--core)">{left.label}</text>
      <text x="252" y="88" fontSize="13" fontWeight="700" fill="var(--pat)">{right.title}</text>
      <text x="252" y="108" fontSize="12.5" fill="var(--pat)">{right.label}</text>
      <text x="170" y="98" fontSize="24" fontWeight="700" fill="var(--ink)">{r(strength)}</text>
      <text x="170" y="116" fontSize="11" fill="var(--ink-2)">겹침 강도</text>
    </g>
  </svg>;
}

export function Figure({ children, caption, title }: { children: ReactNode; caption?: ReactNode; title?: string }) {
  return <figure className="fig">
    {title && <div className="fig-title">{title}</div>}
    {children}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
