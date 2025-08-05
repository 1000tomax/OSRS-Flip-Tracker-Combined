import React from "react";
import DailySummaryLog from "./components/DailySummaryLog";
import useMeta from "./hooks/useMeta";

function App() {
  const meta = useMeta();

  function formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="bg-black text-white min-h-screen font-sans [&_*]:text-white">
      <DailySummaryLog />
      {meta && (
        <div className="text-xs text-gray-400 text-center my-2">
          Last updated: {formatDate(meta.last_updated)}
        </div>
      )}
    </div>
  );
}

export default App;
