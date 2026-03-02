import { useEffect, useState } from "react";
import { loadCapsuleStore } from "../loaders/capsuleStore";

export default function Capsules() {
  const [capsules, setCapsules] = useState([]);

  useEffect(() => {
    loadCapsuleStore().then((data) => setCapsules(data.capsules));
  }, []);

  return (
    <div>
      <h1>Capsules</h1>
      <ul>
        {capsules.map((c: any) => (
          <li key={c.name}>
            <strong>{c.name}</strong> — {c.category} — {c.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
