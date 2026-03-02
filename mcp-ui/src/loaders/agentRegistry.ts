import axios from "axios";

export async function loadAgentRegistry() {
  const res = await axios.get("http://localhost:8000/agent-registry");
  return res.data;
}
