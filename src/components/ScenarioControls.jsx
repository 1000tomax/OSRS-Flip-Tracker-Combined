import React from "react";

export default function ScenarioControls({ state, setState }) {
  const s = state;
  const set = (k) => (e) => setState({ ...s, [k]: typeof e === "number" ? e : Number(e.target.value) });

  return (
    <div className="grid md:grid-cols-3 gap-3">
      <Card label="Starting Net Worth (GP)">
        <input type="number" value={s.startGP} onChange={set("startGP")} className="w-full bg-transparent border rounded-xl px-3 py-2" />
      </Card>
      <Card label="Target (GP)">
        <input type="number" value={s.targetGP} onChange={set("targetGP")} className="w-full bg-transparent border rounded-xl px-3 py-2" />
      </Card>
      <Card label="Paths & Horizon">
        <div className="flex gap-3 items-center">
          <input type="range" min={200} max={4000} step={100} value={s.paths} onChange={set("paths")} className="w-full" />
          <div className="text-right text-xs">
            <div>{s.paths} paths</div>
            <div>{s.horizon} days</div>
          </div>
        </div>
        <input type="range" min={90} max={600} step={5} value={s.horizon} onChange={set("horizon")} className="w-full mt-2" />
      </Card>
      <Card label="Risk (variance)">
        <input type="range" min={0.5} max={1.6} step={0.05} value={s.risk} onChange={set("risk")} className="w-full" />
        <div className="text-xs opacity-70">{s.risk.toFixed(2)}×</div>
      </Card>
      <Card label="Utilization (mean scale)">
        <input type="range" min={0.5} max={1.0} step={0.01} value={s.util} onChange={set("util")} className="w-full" />
        <div className="text-xs opacity-70">{Math.round(s.util * 100)}%</div>
      </Card>
      <Card label="ROI Source">
        <div className="text-xs opacity-70">Reads /public/data/roi.json (percents or decimals). Falls back to demo if missing.</div>
      </Card>
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div className="rounded-2xl p-4 border bg-white/5 border-white/10">
      <div className="text-sm opacity-70 mb-1">{label}</div>
      {children}
    </div>
  );
}