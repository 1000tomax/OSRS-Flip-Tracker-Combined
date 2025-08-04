import { useEffect, useState } from "react";

export default function useDailySummaries() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const indexRes = await fetch("/data/summary-index.json");
        const index = await indexRes.json();

        const summaryPromises = index.map(async (date) => {
          const res = await fetch(`/data/daily-summary/${date}.json`);
          const data = await res.json();
          return { date, ...data };
        });

        const loadedSummaries = await Promise.all(summaryPromises);

        // Sort by date ascending
        loadedSummaries.sort((a, b) => new Date(a.date) - new Date(b.date));

        setSummaries(loadedSummaries);
      } catch (err) {
        console.error("Failed to load summaries:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { summaries, loading };
}
