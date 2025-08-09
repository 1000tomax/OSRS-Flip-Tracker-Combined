// src/pages/Lab.jsx
import React, { useEffect, useState } from "react";
import ForecastCanvas from "../components/ForecastCanvas";
import ScenarioControls from "../components/ScenarioControls";
import UniverseMap from "../components/UniverseMap";
import { loadROIClientSide } from "../lib/roiClient";


export default function Lab() {
  const [roi, setRoi] = useState([]);
  const [items, setItems] = useState([]);
  const [roiStats, setRoiStats] = useState(null);
  const [state, setState] = useState({
    startGP: 10_000_000,
    targetGP: 2147483647,
    horizon: 365,
    paths: 1500,
    risk: 1.0,
    util: 0.85,
  });

  useEffect(() => {
      loadROIClientSide().then(({ roi, startNet, stats }) => {
        setRoi(roi);
        setRoiStats(stats);
        setState((s) => ({ ...s, startGP: startNet || s.startGP }));
      });
      fetch("/data/item-embeddings.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .then((j) => setItems(Array.isArray(j) ? j : []))
        .catch(() => {});
    }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 text-gray-900 dark:text-white">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Lab</h1>
      <p className="opacity-70 mb-6">Interactive crown-jewel demos powered by your data.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">Flip Universe Map</h2>
          <UniverseMap items={items} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Max-Cash Flight Simulator</h2>
          <ScenarioControls state={state} setState={setState} />
          <div className="mt-3" />
          <ForecastCanvas
              startGP={state.startGP}
              targetGP={state.targetGP}
              horizon={state.horizon}
              paths={state.paths}
              roi={roi}
              risk={state.risk}
              util={state.util}
              stats={roiStats}
            />
        </section>
      </div>
    </div>
  );
}
