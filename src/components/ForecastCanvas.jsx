import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { simulate, gpFormat } from "../lib/monteCarlo";

export default function ForecastCanvas({
  startGP,
  targetGP = 2147483647,
  horizon = 365,
  paths = 1500,
  roi = [],
  risk = 1.0,
  util = 0.85,
  seed = 12345,
  stats,
}) {
  const { data, eta } = useMemo(() => {
    const res = simulate({ startGP, targetGP, horizonDays: horizon, paths, roiHistory: roi, riskScale: risk, utilScale: util, seed });
    const data = new Array(horizon).fill(0).map((_, i) => ({ day: i + 1, p10: res.p10[i], p50: res.p50[i], p90: res.p90[i] }));
    return { data, eta: { p10: res.etaP10, p50: res.etaP50, p90: res.etaP90 } };
  }, [startGP, targetGP, horizon, paths, roi, risk, util, seed]);

 return (
     <div className="rounded-2xl border bg-white/5 border-white/10 p-3" style={{ height: 420 }}>
       {/* chart here unchanged */}
       <ResponsiveContainer width="100%" height="100%">{/* ... */}</ResponsiveContainer>
       <div className="mt-2 text-xs opacity-70">
         ETA — P10: {eta.p10 ? `Day ${eta.p10}` : "> horizon"} · P50: {eta.p50 ? `Day ${eta.p50}` : "> horizon"} · P90: {eta.p90 ? `Day ${eta.p90}` : "> horizon"}
       </div>
       {stats?.n ? (
         <div className="mt-1 text-[11px] opacity-60">
           Sample: {stats.n} days{stats.firstDateUsed ? ` from ${stats.firstDateUsed}` : ""}
           {typeof stats.median === 'number' ? ` · median ${(stats.median*100).toFixed(1)}%` : ""}
           {typeof stats.p90 === 'number' ? ` · P90 ${(stats.p90*100).toFixed(1)}%` : ""}
         </div>
       ) : null}
     </div>
   );
 }