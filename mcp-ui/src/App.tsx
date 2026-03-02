import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Capsules from "./pages/Capsules";
import Agents from "./pages/Agents";
import Tasks from "./pages/Tasks";

function App() {
  return (
    <BrowserRouter>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/">Capsules</Link> |{" "}
        <Link to="/agents">Agents</Link> |{" "}
        <Link to="/tasks">Tasks</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Capsules />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
