import axios from "axios";

export async function loadAgentTasks() {
  const res = await axios.get("http://localhost:8000/agent-tasks");
  return res.data;
}
