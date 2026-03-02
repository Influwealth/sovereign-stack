import { useEffect, useState } from "react";
import { loadAgentTasks } from "../loaders/agentTasks";

export default function Tasks() {
  const [tasks, setTasks] = useState({});

  useEffect(() => {
    loadAgentTasks().then((data) => setTasks(data));
  }, []);

  return (
    <div>
      <h1>Agent Tasks</h1>
      {Object.entries(tasks).map(([file, task]: any) => (
        <div key={file}>
          <h3>{file}</h3>
          <pre>{JSON.stringify(task, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
