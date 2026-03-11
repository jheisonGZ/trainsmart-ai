import { BrowserRouter, Routes, Route } from "react-router-dom";

import Profile from "../pages/Profile";
import HealthHistory from "../pages/HealthHistory";
import Routine from "../pages/Routine";
import Progress from "../pages/Progress";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<Login />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/health" element={<HealthHistory />} />
  <Route path="/routine" element={<Routine />} />
  <Route path="/progress" element={<Progress />} />
</Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;