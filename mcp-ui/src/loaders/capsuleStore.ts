import axios from "axios";

export async function loadCapsuleStore() {
  const res = await axios.get("http://localhost:8000/capsule-store");
  return res.data;
}
