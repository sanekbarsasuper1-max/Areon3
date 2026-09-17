const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const jsonHeaders = { 'Content-Type': 'application/json' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // The JWT lives in an httpOnly cookie set by the backend at
    // /auth/steam/return — this is what sends it along with every call.
    credentials: 'include',
  });

  if (res.status === 401) {
    throw new Error('unauthenticated');
  }
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

export interface Me {
  id: string;
  personaName: string;
  avatarFull: string;
  statsExposed: boolean;
  isAdmin: boolean;
}

export interface AdminStats {
  users: number;
  teams: number;
  tournaments: number;
  matches: number;
  heroes: number;
  draftSessions: number;
}

export interface AdminUser {
  id: string;
  personaName: string;
  avatarFull: string;
  accountId32: number;
  statsExposed: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  _count: { matches: number; teamMemberships: number };
}

export interface MatchSummary {
  id: string;
  matchId: string;
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldPerMin: number;
  xpPerMin: number;
  durationSec: number;
  startTime: string;
  won: boolean;
}

export interface Insight {
  tone: 'positive' | 'negative' | 'neutral';
  message: string;
}

export interface MatchDetail {
  match: MatchSummary;
  detail: {
    heroDamage: number;
    towerDamage: number;
    heroHealing: number;
    lastHits: number;
    denies: number;
    goldT: number[];
    insights: Insight[];
  };
}

export interface ProfileSummary {
  matches: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  avgGpm: number;
  avgXpm: number;
}

export interface Hero {
  id: number;
  localizedName: string;
  iconUrl: string;
  primaryAttr: string;
  roles?: string[];
  captainsModeAvailable?: boolean;
}

export interface HeroDetail extends Hero {
  attackType: string;
  roles: string[];
  baseStr: number | null;
  baseAgi: number | null;
  baseInt: number | null;
  moveSpeed: number | null;
  countersJson: { goodAgainst: { heroId: number; winrate: number }[]; weakAgainst: { heroId: number; winrate: number }[] } | null;
  itemBuildsJson: { items: ItemBuild[]; sampledMatches: number } | null;
}

export interface TeamMember {
  userId: string;
  role: 'OWNER' | 'CAPTAIN' | 'MEMBER';
  position: string | null;
  user: { personaName: string; avatarFull: string };
}

export interface Team {
  id: string;
  name: string;
  tag: string | null;
  members: TeamMember[];
}

export interface TeamInvite {
  id: string;
  teamId: string;
  team: { name: string };
  invitedByUser: { personaName: string };
}

export interface TournamentMatch {
  id: string;
  bracket: 'winners' | 'losers' | 'grand_final' | 'bracket_reset';
  round: number;
  position: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: 'PENDING' | 'COMPLETED';
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  maxTeams: number;
  matchFormat: string;
  bracketFormat: 'single_elimination' | 'double_elimination';
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdByUserId: string;
  registrations: { teamId: string; team: Team }[];
  matches: TournamentMatch[];
}

export type DraftSide = 'FIRST_PICK' | 'SECOND_PICK';

export interface DraftStep {
  step: number;
  side: DraftSide;
  action: 'ban' | 'pick';
  timeLimitSec: number;
}

export interface DraftEvent extends DraftStep {
  heroId: number | null;
  timedOut: boolean;
}

export interface DraftSession {
  id: string;
  mode: 'free' | 'pro_replay';
  sequence: DraftStep[];
  actions: DraftEvent[];
  status: 'waiting_for_opponent' | 'in_progress' | 'completed' | 'cancelled';
  radiantSide: DraftSide;
  currentStepStartedAt: string;
  rulesVersion: string;
  reserveFirstSec: number;
  reserveSecondSec: number;
  opponentType: 'self' | 'friend' | 'matchmaking' | 'ai';
  createdByUserId: string;
  invitedUserId: string | null;
  participantSecondUserId: string | null;
  aiSide: DraftSide | null;
}

export interface ProMatch {
  match_id: number;
  radiant_name: string | null;
  dire_name: string | null;
  radiant_win: boolean;
}

export interface OnlinePlayer {
  id: string;
  personaName: string;
  avatarFull: string;
}

export interface CompositionScore {
  total: number;
  roleCoverage: number;
  attributeDiversity: number;
  counterAwareness: number;
  coveredRoles: string[];
  missingRoles: string[];
  distinctAttributes: number;
  counterAwareEligiblePicks: number;
  counterAwareRatio: number | null;
  mostDangerousUnbanned: { heroId: number; score: number } | null;
  reasons: string[];
}

export interface CounterPair {
  radiantHeroId: number;
  direHeroId: number;
  favors: 'radiant' | 'dire';
}

export interface DraftRating {
  radiant: CompositionScore;
  dire: CompositionScore;
  counterPairs: CounterPair[];
  notes: { synergiesAvailable: boolean; itemRecommendationsAvailable: boolean };
}

export interface FoundPlayer {
  id: string;
  personaName: string;
  avatarFull: string;
  accountId32: number;
  rankTier: number | null;
  mmrEstimate: number | null;
  matchCount: number;
}

export interface Item {
  id: number;
  name: string;
  dname: string;
  iconUrl: string;
}

export interface ItemBuild {
  itemId: number;
  games: number;
  wins: number;
  winrate: number;
}

export interface TrialItem {
  id: string;
  status: 'ACTIVE' | 'COMPLETED';
  progressJson: Record<string, any>;
  completedAt: string | null;
  description: string; // pre-formatted by the backend, placeholders already resolved
  template: {
    id: string;
    code: string;
    category: string;
    difficulty: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    title: string;
    targetValue: number;
    rewardShards: number;
    active: boolean;
    completionCount?: number;
  };
}

export interface TrialCycle {
  id: string;
  cycleNumber: number;
  startedAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'CLOSED';
  trials: TrialItem[];
}

export interface ShardTransactionItem {
  id: string;
  amount: number;
  type: string;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface MinesweeperConfig {
  id: string;
  difficulty: string;
  boardWidth: number;
  boardHeight: number;
  mineCount: number;
  winShards: number;
  lossShards: number;
  winRating: number;
  lossRating: number;
  streakBonusShards: number;
  streakBonusThreshold: number;
  active: boolean;
}

export interface MinesweeperSession {
  id: string;
  difficulty: string;
  boardWidth: number;
  boardHeight: number;
  revealedJson: number[];
  cellNumbersJson: Record<number, number>;
  flaggedJson: number[];
  mineLayoutJson: number[]; // only populated by the server on a LOST session, for the explosion display
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  shardsAwarded: number | null;
  ratingChange: number | null;
}

export interface MinesweeperRevealResult {
  session: MinesweeperSession;
  revealed: number[];
  hitMine: boolean;
  shardsAwarded?: number;
  ratingChange?: number;
}

export interface MiniGameStats {
  played: number;
  wins: number;
  losses: number;
  bestTimeSec: number | null;
  currentWinStreak: number;
  bestWinStreak: number;
  totalShardsEarned: number;
  totalRatingChange: number;
}

export interface WheelSpinResult {
  hero: Hero;
  concept: { conceptName: string; reasoning: string };
  items: Item[];
}

export interface HofEntry {
  id: string;
  value: string;
  rawValue: number | null;
  description: string | null;
  isCurrent: boolean;
  isPinned: boolean;
  achievedAt: string;
  createdByAdmin: boolean;
  user: { id: string; personaName: string; avatarFull: string } | null;
  team: { id: string; name: string; logoUrl: string | null } | null;
  recordType?: HofRecordType;
}

export interface HofRecordType {
  id: string;
  key: string;
  category: string;
  title: string;
  icon: string;
  mode: 'SUPERSEDING' | 'ONE_TIME' | 'PER_EVENT';
  isAutomatic: boolean;
  entries: HofEntry[];
}

export interface AreonVersion {
  id: string;
  version: string;
  releasedAt: string;
  added: string[];
  fixed: string[];
  improved: string[];
  addressed: string[];
  knownIssues: string[];
  isCurrent: boolean;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'REJECTED';
  adminNote: string | null;
  createdAt: string;
  user?: { personaName: string; avatarFull: string };
  implementedInVersion?: { version: string } | null;
}

export interface SupportTicket {
  id: string;
  category: string;
  message: string;
  status: 'OPEN' | 'CLOSED';
  adminReply: string | null;
  createdAt: string;
  repliedAt: string | null;
}

export const api = {
  loginUrl: () => `${API_URL}/auth/steam`,
  me: () => request<Me>('/auth/me'),
  heartbeat: () => request('/players/me/heartbeat', { method: 'POST' }),
  online: () => request<OnlinePlayer[]>('/players/online'),
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminUsers: () => request<AdminUser[]>('/admin/users'),
  adminTeams: () => request<Team[]>('/admin/teams'),
  adminTournaments: () => request<Tournament[]>('/admin/tournaments'),
  adminSyncHeroes: () => request<{ synced: number }>('/admin/heroes/sync', { method: 'POST' }),
  adminSyncMatchups: (heroId: number) =>
    request(`/admin/heroes/${heroId}/sync-matchups`, { method: 'POST' }),
  adminBanUser: (id: string, reason?: string) =>
    request<AdminUser>(`/admin/users/${id}/ban`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ reason }),
    }),
  adminUnbanUser: (id: string) => request<AdminUser>(`/admin/users/${id}/unban`, { method: 'POST' }),
  adminEditUser: (id: string, data: { personaName?: string; statsExposed?: boolean }) =>
    request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }),
  adminForceCloseTournament: (id: string) =>
    request<Tournament>(`/admin/tournaments/${id}/force-close`, { method: 'POST' }),
  adminForceMatchResult: (tournamentId: string, matchId: string, winnerTeamId: string, scoreA: number, scoreB: number) =>
    request(`/admin/tournaments/${tournamentId}/matches/${matchId}/force-result`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ winnerTeamId, scoreA, scoreB }),
    }),
  adminHeroes: () => request<HeroDetail[]>('/admin/heroes'),
  adminSetHeroCmAvailable: (heroId: number, captainsModeAvailable: boolean) =>
    request<HeroDetail>(`/admin/heroes/${heroId}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ captainsModeAvailable }),
    }),
  adminActiveDrafts: () => request<DraftSession[]>('/admin/draft-sessions'),
  adminUndoDraft: (sessionId: string) =>
    request<DraftSession>(`/admin/draft-sessions/${sessionId}/undo`, { method: 'POST' }),
  searchPlayers: (params: { q?: string; minRank?: number; maxRank?: number; laneRole?: number; heroId?: number; minMatches?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.minRank != null) qs.set('minRank', String(params.minRank));
    if (params.maxRank != null) qs.set('maxRank', String(params.maxRank));
    if (params.laneRole != null) qs.set('laneRole', String(params.laneRole));
    if (params.heroId != null) qs.set('heroId', String(params.heroId));
    if (params.minMatches != null) qs.set('minMatches', String(params.minMatches));
    return request<FoundPlayer[]>(`/players/search?${qs.toString()}`);
  },
  statsStatus: () => request<{ statsExposed: boolean }>('/players/me/stats-status'),
  summary: () => request<ProfileSummary>('/players/me/summary'),
  heroes: () => request<Hero[]>('/heroes'),
  hero: (id: number) => request<HeroDetail>(`/heroes/${id}`),
  items: () => request<Item[]>('/items'),
  adminSyncItems: () => request<{ synced: number }>('/admin/items/sync', { method: 'POST' }),
  adminSyncHeroItems: (heroId: number) =>
    request<{ items: ItemBuild[]; sampledMatches: number }>(`/admin/heroes/${heroId}/sync-items`, { method: 'POST' }),
  myTeams: () => request<Team[]>('/teams/me'),
  myInvites: () => request<TeamInvite[]>('/teams/me/invites'),
  team: (id: string) => request<Team>(`/teams/${id}`),
  createTeam: (name: string, tag?: string) =>
    request<Team>('/teams', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name, tag }) }),
  inviteToTeam: (teamId: string, accountId32: number) =>
    request(`/teams/${teamId}/invites`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ accountId32 }),
    }),
  acceptInvite: (inviteId: string) => request(`/teams/invites/${inviteId}/accept`, { method: 'POST' }),
  declineInvite: (inviteId: string) => request(`/teams/invites/${inviteId}/decline`, { method: 'POST' }),
  transferOwnership: (teamId: string, newOwnerUserId: string) =>
    request<Team>(`/teams/${teamId}/transfer-ownership`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ newOwnerUserId }),
    }),
  leaveTeam: (teamId: string, userId: string) =>
    request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  tournaments: () => request<Tournament[]>('/tournaments'),
  tournament: (id: string) => request<Tournament>(`/tournaments/${id}`),
  createTournament: (input: { name: string; maxTeams: number; matchFormat?: string; bracketFormat?: string }) =>
    request<Tournament>('/tournaments', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(input) }),
  registerTeam: (tournamentId: string, teamId: string) =>
    request(`/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ teamId }),
    }),
  generateBracket: (tournamentId: string) =>
    request<Tournament>(`/tournaments/${tournamentId}/generate-bracket`, { method: 'POST' }),
  reportResult: (tournamentId: string, matchId: string, winnerTeamId: string, scoreA: number, scoreB: number) =>
    request(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ winnerTeamId, scoreA, scoreB }),
    }),
  draftSessions: () => request<DraftSession[]>('/draft-trainer/sessions'),
  draftSession: (id: string) => request<DraftSession>(`/draft-trainer/sessions/${id}`),
  createFreeDraft: (options?: { radiantSide?: DraftSide }) =>
    request<DraftSession>('/draft-trainer/free', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(options ?? {}),
    }),
  createAiDraft: (options?: { radiantSide?: DraftSide; botSide?: DraftSide }) =>
    request<DraftSession>('/draft-trainer/ai', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(options ?? {}),
    }),
  inviteFriend: (invitedUserId: string, radiantSide?: DraftSide) =>
    request<DraftSession>('/draft-trainer/invite', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ invitedUserId, radiantSide }),
    }),
  pendingInvites: () => request<DraftSession[]>('/draft-trainer/invites'),
  joinDraft: (sessionId: string) =>
    request<DraftSession>(`/draft-trainer/sessions/${sessionId}/join`, { method: 'POST' }),
  searchMatch: () => request<DraftSession>('/draft-trainer/matchmaking/search', { method: 'POST' }),
  cancelWaiting: (sessionId: string) =>
    request<DraftSession>(`/draft-trainer/sessions/${sessionId}/cancel`, { method: 'POST' }),
  draftAction: (sessionId: string, heroId: number) =>
    request<DraftSession>(`/draft-trainer/sessions/${sessionId}/actions`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ heroId }),
    }),
  draftTimeout: (sessionId: string) =>
    request<DraftSession>(`/draft-trainer/sessions/${sessionId}/timeout`, { method: 'POST' }),
  proMatches: () => request<ProMatch[]>('/draft-trainer/pro-matches'),
  draftRating: (sessionId: string) => request<DraftRating>(`/draft-trainer/sessions/${sessionId}/rating`),
  startProReplay: (matchId: number) =>
    request<DraftSession>(`/draft-trainer/pro-matches/${matchId}/replay`, { method: 'POST' }),
  matches: (params: { heroId?: number; result?: 'win' | 'loss'; days?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.heroId) qs.set('heroId', String(params.heroId));
    if (params.result) qs.set('result', params.result);
    if (params.days) qs.set('days', String(params.days));
    return request<MatchSummary[]>(`/players/me/matches?${qs.toString()}`);
  },
  syncMatches: () => request<{ synced: number }>('/players/me/matches/sync', { method: 'POST' }),
  matchDetail: (id: string) => request<MatchDetail>(`/players/me/matches/${id}/detail`),
  myTrialCycle: () => request<TrialCycle | null>('/trials/me'),
  trialHistory: () => request<TrialCycle[]>('/trials/history'),
  shardBalance: () => request<{ balance: number }>('/shards/balance'),
  shardHistory: () => request<ShardTransactionItem[]>('/shards/history'),
  adminTrialTemplates: () => request<any[]>('/admin/trials/templates'),
  adminUpdateTrialTemplate: (id: string, data: { active?: boolean; rewardShards?: number; difficulty?: string }) =>
    request(`/admin/trials/templates/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(data) }),
  adminAdjustShards: (userId: string, amount: number, reason: string) =>
    request(`/admin/users/${userId}/shards/adjust`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ amount, reason }),
    }),
  musicFavorites: () => request<{ providerTrackId: string; name: string; artist: string; imageUrl: string | null }[]>('/music/favorites'),
  addMusicFavorite: (track: { providerTrackId: string; name: string; artist: string; imageUrl?: string }) =>
    request('/music/favorites', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(track) }),
  removeMusicFavorite: (providerTrackId: string) =>
    request(`/music/favorites/${providerTrackId}`, { method: 'DELETE' }),
  coachAnalysis: (matchRowId: string, depth: 'quick' | 'full' | 'coach' = 'full') =>
    request<{ status?: 'processing'; message?: string; reportJson?: { narrative: string } }>(
      `/matches/${matchRowId}/coach-analysis?depth=${depth}`,
    ),
  patchStatus: () =>
    request<{ currentPatch: string; status: string; lastCheckedAt: string | null; lastSyncedAt: string | null; lastError: string | null; syncProgress: any }>('/patch/status'),
  adminCheckPatchNow: () => request('/admin/patch/check-now', { method: 'POST' }),
  adminRollbackPatch: () => request('/admin/patch/rollback', { method: 'POST' }),
  minesweeperConfigs: () => request<MinesweeperConfig[]>('/minigames/minesweeper/configs'),
  minesweeperStats: () => request<MiniGameStats | null>('/minigames/minesweeper/stats'),
  minesweeperStart: (difficulty: string) =>
    request<MinesweeperSession>('/minigames/minesweeper/sessions', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ difficulty }) }),
  minesweeperReveal: (sessionId: string, cellIndex: number) =>
    request<MinesweeperRevealResult>(`/minigames/minesweeper/sessions/${sessionId}/reveal`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({ cellIndex }),
    }),
  minesweeperFlag: (sessionId: string, cellIndex: number) =>
    request<MinesweeperSession>(`/minigames/minesweeper/sessions/${sessionId}/flag`, {
      method: 'POST', headers: jsonHeaders, body: JSON.stringify({ cellIndex }),
    }),
  wheelSpin: () => request<WheelSpinResult>('/wheel-of-fate/spin', { method: 'POST' }),
  hallOfFame: () => request<HofRecordType[]>('/hall-of-fame'),
  hallOfFameRecord: (key: string) => request<{ recordType: HofRecordType; entries: HofEntry[] } | null>(`/hall-of-fame/record/${key}`),
  hallOfFameMine: () => request<HofEntry[]>('/hall-of-fame/me'),
  versions: () => request<AreonVersion[]>('/versions'),
  currentVersion: () => request<AreonVersion | null>('/versions/current'),
  version: (version: string) => request<AreonVersion>(`/versions/${version}`),
  suggestions: () => request<Suggestion[]>('/suggestions'),
  mySuggestions: () => request<Suggestion[]>('/suggestions/mine'),
  createSuggestion: (title: string, description: string) =>
    request<Suggestion>('/suggestions', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ title, description }) }),
  myTickets: () => request<SupportTicket[]>('/support/tickets'),
  createTicket: (category: string, message: string) =>
    request<SupportTicket>('/support/tickets', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ category, message }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  reportPlayer: (reportedId: string, category: string, description: string) =>
    request('/security/reports', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ reportedId, category, description }) }),
  adminSecurityLog: () => request<any[]>('/admin/security/log'),
  adminReportQueue: () => request<any[]>('/admin/security/reports'),
  adminUpdateReport: (id: string, status: string, adminNote?: string) =>
    request(`/admin/security/reports/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status, adminNote }) }),
};
