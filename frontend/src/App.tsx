import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "@/components/layout/Nav";
import DotGridBackground from "@/components/DotGridBackground";
import LandingPage from "@/pages/LandingPage";
import CreateActivityPage from "@/pages/CreateActivityPage";
import ActivityPage from "@/pages/ActivityPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PollPage from "@/pages/PollPage";
import ProposalPage from "@/pages/ProposalPage";
import EventPage from "@/pages/EventPage";

export default function App() {
  return (
    <BrowserRouter>
      <DotGridBackground />
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new" element={<CreateActivityPage />} />
        <Route path="/activity/:id/:slug" element={<ActivityPage />} />
        <Route path="/activity/:id/:slug/poll/:pollId" element={<PollPage />} />
        <Route path="/activity/:id/:slug/proposal/:proposalId" element={<ProposalPage />} />
        <Route path="/activity/:id/:slug/event/:eventId" element={<EventPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
