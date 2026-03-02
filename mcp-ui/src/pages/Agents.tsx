import { useEffect, useState } from "react";
import { loadAgentRegistry } from "../loaders/agentRegistry";

export default function Agents() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    loadAgentRegistry().then((data) => setAgents(data.agents));
  }, []);

  return (
    <div>
      <h1>Agents</h1>
      <ul>
        {agents.map((a: any) => (
          <li key={a.id}>
            <strong>{a.id}</strong> — {a.role} — {a.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
