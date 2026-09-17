/**
 * Central audio manifest.
 *
 * ARCHITECTURE CHANGE from the original per-section ambient loops: the
 * global music player spec superseded "each normal section has its
 * own background theme" — GLOBAL (the user's own searched/queued
 * music) now plays across every normal page (home, profile, matches,
 * heroes, tournaments list, statistics, etc). Only entering a genuine
 * special MODE (currently just Draft; Tournament reserved for later,
 * per the spec's own "возможно, позже") pauses GLOBAL and plays a
 * fixed MODE track instead. `tournaments`/`statistics` ambient themes
 * from the earlier design are gone, not just unused — GLOBAL covers
 * that role now.
 *
 * IMPORTANT — real audio files are NOT included, same honest gap as
 * before. See /public/audio/README.md.
 */

export type AppMode = 'draft'; // | 'tournament' later, per the spec's own extensibility requirement

export const MODE_MUSIC_TRACKS: Record<AppMode, string> = {
  draft: '/audio/music/draft/theme.mp3',
};

// Plays once, at the moment of the very first login of the browser
// session (and again on a fresh login without a page reload). Doesn't
// transition into anything afterward — GLOBAL is user-driven now, so
// there's no fixed "home theme" for it to hand off into; it's silent
// until the user searches for and picks something themselves.
export const INTRO_STINGER = '/audio/music/home/intro.mp3';

export type SfxName =
  | 'draft_ban'
  | 'draft_pick_self'
  | 'draft_pick_enemy'
  | 'draft_phase_ban_start'
  | 'draft_phase_pick_start'
  | 'draft_step_transition'
  | 'draft_complete'
  | 'timer_tension' // looped/triggered under 10s remaining
  | 'timer_critical' // per-second beep under 5s remaining
  | 'timer_expired'
  | 'ui_confirm'
  | 'ui_error'
  | 'nav_draft_open'
  | 'nav_match_start'
  | 'nav_statistics_open'
  | 'nav_tournament_open'
  | 'nav_result'
  | 'minesweeper_reveal'
  | 'minesweeper_flag_place'
  | 'minesweeper_flag_remove'
  | 'minesweeper_explosion'
  | 'minesweeper_victory'
  | 'minesweeper_defeat'
  | 'wheel_spin_start'
  | 'wheel_result';

export const SFX_FILES: Record<SfxName, string> = {
  draft_ban: '/audio/sfx/draft/ban.mp3',
  draft_pick_self: '/audio/sfx/draft/pick_self.mp3',
  draft_pick_enemy: '/audio/sfx/draft/pick_enemy.mp3',
  draft_phase_ban_start: '/audio/sfx/draft/phase_ban_start.mp3',
  draft_phase_pick_start: '/audio/sfx/draft/phase_pick_start.mp3',
  draft_step_transition: '/audio/sfx/draft/step_transition.mp3',
  draft_complete: '/audio/sfx/draft/draft_complete.mp3',
  timer_tension: '/audio/sfx/draft/timer_tension.mp3',
  timer_critical: '/audio/sfx/draft/timer_critical.mp3',
  timer_expired: '/audio/sfx/draft/timer_expired.mp3',
  ui_confirm: '/audio/sfx/ui/confirm.mp3',
  ui_error: '/audio/sfx/ui/error.mp3',
  nav_draft_open: '/audio/sfx/system/nav_draft_open.mp3',
  nav_match_start: '/audio/sfx/system/nav_match_start.mp3',
  nav_statistics_open: '/audio/sfx/system/nav_statistics_open.mp3',
  nav_tournament_open: '/audio/sfx/system/nav_tournament_open.mp3',
  nav_result: '/audio/sfx/system/nav_result.mp3',
  minesweeper_reveal: '/audio/sfx/minigames/minesweeper/reveal.mp3',
  minesweeper_flag_place: '/audio/sfx/minigames/minesweeper/flag_place.mp3',
  minesweeper_flag_remove: '/audio/sfx/minigames/minesweeper/flag_remove.mp3',
  minesweeper_explosion: '/audio/sfx/minigames/minesweeper/explosion.mp3',
  minesweeper_victory: '/audio/sfx/minigames/minesweeper/victory.mp3',
  minesweeper_defeat: '/audio/sfx/minigames/minesweeper/defeat.mp3',
  wheel_spin_start: '/audio/sfx/minigames/wheel-of-fate/spin_start.mp3',
  wheel_result: '/audio/sfx/minigames/wheel-of-fate/result.mp3',
};
