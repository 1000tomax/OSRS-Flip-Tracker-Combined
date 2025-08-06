import { useEffect, useState } from 'react';

export function useJsonData(path) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(path)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => {
        console.error("Failed to load JSON:", path, err);
        setData(null);
      });
  }, [path]);

  return data;
}
