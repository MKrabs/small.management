import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "@/components/layout/Nav";
import LandingPage from "@/pages/LandingPage";
import CreateActivityPage from "@/pages/CreateActivityPage";
import ActivityPage from "@/pages/ActivityPage";
import MyActivitiesPage from "@/pages/MyActivitiesPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new" element={<CreateActivityPage />} />
        <Route path="/activities" element={<MyActivitiesPage />} />
        <Route path="/activity/:id/:slug" element={<ActivityPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
