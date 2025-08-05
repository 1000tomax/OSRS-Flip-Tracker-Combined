import { useEffect, useState } from "react";

export default function useMeta() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    fetch("/data/meta.json")
      .then((res) => res.json())
      .then(setMeta);
  }, []);

  return meta;
}
