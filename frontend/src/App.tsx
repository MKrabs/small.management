import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Nav from "@/components/layout/Nav";
import DotGridBackground from "@/components/DotGridBackground";
import LandingPage from "@/pages/LandingPage";
import CreateActivityPage from "@/pages/CreateActivityPage";
import ActivityPage from "@/pages/ActivityPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PollPage from "@/pages/PollPage";
import EventPage from "@/pages/EventPage";
import ChangelogPage from "@/pages/ChangelogPage";

export default function App() {
  return (
    <BrowserRouter>
      <DotGridBackground />
      <Toaster />
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new" element={<CreateActivityPage />} />
        <Route path="/activity/:id/:slug" element={<ActivityPage />} />
        <Route path="/activity/:id/:slug/poll/:pollId" element={<PollPage />} />
        <Route path="/activity/:id/:slug/event/:eventId" element={<EventPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        {/* unmatched routes (e.g. a stray navigate() from the landing-page
         * demo's cards, which aren't real pages) redirect back to "/" —
         * rendering LandingPage in place here instead would leave the bad
         * path in the address bar, so a second click compounds onto it
         * (/poll/3/poll/3/...); redirecting resets the location each time */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
