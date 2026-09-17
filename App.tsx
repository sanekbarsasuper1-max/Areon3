import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api, Me } from './api';
import { AppHeader } from './components/AppHeader';
import { LoginGate } from './pages/LoginGate';
import { OnboardingExposeData } from './pages/OnboardingExposeData';
import { Profile } from './pages/Profile';
import { AllMatches } from './pages/AllMatches';
import { MatchAnalyzer } from './pages/MatchAnalyzer';
import { HeroPage } from './pages/HeroPage';
import { Teams } from './pages/Teams';
import { TeamDetail } from './pages/TeamDetail';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { DraftTrainer } from './pages/DraftTrainer';
import { DraftSessionPage } from './pages/DraftSessionPage';
import { PlayerSearch } from './pages/PlayerSearch';
import { AdminPanel } from './pages/AdminPanel';
import { Banned } from './pages/Banned';
import { Settings } from './pages/Settings';
import { TrialsPage } from './pages/TrialsPage';
import { ShopPage } from './pages/ShopPage';
import { MinesweeperPage } from './pages/MinesweeperPage';
import { WheelOfFatePage } from './pages/WheelOfFatePage';
import { HallOfFamePage } from './pages/HallOfFamePage';
import { UpdatesPage } from './pages/UpdatesPage';
import { SupportPage } from './pages/SupportPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { VersionNotification } from './components/VersionNotification';
import { AudioProvider, useAudioAuthSync, useAppMode } from './audio/AudioContext';
import { GlobalMusicPlayer } from './components/GlobalMusicPlayer';

type SessionState = 'loading' | 'anonymous' | 'authenticated';

export function App() {
  const [session, setSession] = useState<SessionState>('loading');
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api
      .me()
      .then((m) => {
        setMe(m);
        setSession('authenticated');
      })
      .catch(() => setSession('anonymous'));
  }, []);

  // Powers the "invite an online player" feature in Draft Trainer —
  // /players/online only shows users seen in the last 60s, so this
  // needs to fire well under that.
  useEffect(() => {
    if (session !== 'authenticated') return;
    api.heartbeat().catch(() => {});
    const interval = setInterval(() => api.heartbeat().catch(() => {}), 20_000);
    return () => clearInterval(interval);
  }, [session]);

  if (session === 'loading') return null;

  return (
    <AudioProvider>
      <BrowserRouter>
        <AppShell session={session} me={me} />
      </BrowserRouter>
    </AudioProvider>
  );
}

// Routes that count as a special MODE (pauses GLOBAL music, plays a
// fixed mode track instead — see useAppMode). Only Draft exists today;
// Tournament is the spec's own explicitly-named "later" extension —
// adding it means one more entry here plus a MODE_MUSIC_TRACKS.tournament
// file, nothing structural.
function modeForPath(pathname: string): 'draft' | null {
  if (pathname.startsWith('/draft-trainer')) return 'draft';
  return null;
}

// Split out so it can call useLocation() — that hook only works inside
// the Router, which App() itself renders one level up.
function AppShell({ session, me }: { session: SessionState; me: Me | null }) {
  const location = useLocation();
  useAudioAuthSync(session === 'authenticated');
  useAppMode(session === 'authenticated' ? modeForPath(location.pathname) : null);

  const NO_HEADER_PATHS = ['/', '/onboarding/expose-data', '/banned'];
  const showChrome = session === 'authenticated' && me != null && !NO_HEADER_PATHS.includes(location.pathname);

  return (
    <>
      {showChrome && <AppHeader me={me} />}
      <Routes>
        <Route
          path="/"
          element={session === 'authenticated' ? <Navigate to={me!.statsExposed ? '/profile' : '/onboarding/expose-data'} /> : <LoginGate />}
        />
        <Route
          path="/onboarding/expose-data"
          element={session === 'authenticated' ? <OnboardingExposeData /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={session === 'authenticated' ? <Profile /> : <Navigate to="/" />}
        />
        <Route
          path="/matches"
          element={session === 'authenticated' ? <AllMatches /> : <Navigate to="/" />}
        />
        <Route
          path="/matches/:id"
          element={session === 'authenticated' ? <MatchAnalyzer /> : <Navigate to="/" />}
        />
        <Route
          path="/heroes/:id"
          element={session === 'authenticated' ? <HeroPage /> : <Navigate to="/" />}
        />
        <Route
          path="/teams"
          element={session === 'authenticated' ? <Teams /> : <Navigate to="/" />}
        />
        <Route
          path="/teams/:id"
          element={session === 'authenticated' ? <TeamDetail /> : <Navigate to="/" />}
        />
        <Route
          path="/tournaments"
          element={session === 'authenticated' ? <Tournaments /> : <Navigate to="/" />}
        />
        <Route
          path="/tournaments/:id"
          element={session === 'authenticated' ? <TournamentDetail /> : <Navigate to="/" />}
        />
        <Route
          path="/draft-trainer"
          element={session === 'authenticated' ? <DraftTrainer /> : <Navigate to="/" />}
        />
        <Route
          path="/draft-trainer/:id"
          element={session === 'authenticated' ? <DraftSessionPage /> : <Navigate to="/" />}
        />
        <Route
          path="/players/search"
          element={session === 'authenticated' ? <PlayerSearch /> : <Navigate to="/" />}
        />
        <Route
          path="/admin"
          element={session === 'authenticated' && me?.isAdmin ? <AdminPanel /> : <Navigate to="/" />}
        />
        <Route
          path="/settings"
          element={session === 'authenticated' ? <Settings /> : <Navigate to="/" />}
        />
        <Route
          path="/trials"
          element={session === 'authenticated' ? <TrialsPage /> : <Navigate to="/" />}
        />
        <Route
          path="/shop"
          element={session === 'authenticated' ? <ShopPage /> : <Navigate to="/" />}
        />
        <Route
          path="/minigames/minesweeper"
          element={session === 'authenticated' ? <MinesweeperPage /> : <Navigate to="/" />}
        />
        <Route
          path="/wheel-of-fate"
          element={session === 'authenticated' ? <WheelOfFatePage /> : <Navigate to="/" />}
        />
        <Route
          path="/hall-of-fame"
          element={session === 'authenticated' ? <HallOfFamePage /> : <Navigate to="/" />}
        />
        <Route
          path="/updates"
          element={session === 'authenticated' ? <UpdatesPage /> : <Navigate to="/" />}
        />
        <Route
          path="/support"
          element={session === 'authenticated' ? <SupportPage /> : <Navigate to="/" />}
        />
        <Route
          path="/suggestions"
          element={session === 'authenticated' ? <SuggestionsPage /> : <Navigate to="/" />}
        />
        <Route path="/banned" element={<Banned />} />
      </Routes>
      {showChrome && <GlobalMusicPlayer />}
      {showChrome && <VersionNotification />}
    </>
  );
}
