// ── UI string keys (English source) ──
export const UI_STRINGS: Record<string, string> = {
  // Navigation
  nav_dashboard: 'Dashboard',
  nav_trips: 'My Trips',
  nav_journal: 'Journal',
  nav_stats: 'Stats',

  // Dashboard stats
  stat_countries: 'Countries visited',
  stat_distance: 'Distance traveled',
  stat_days: 'Days abroad',
  stat_entries: 'Journal entries',
  stat_sub_countries: 'of 195 total',
  stat_sub_distance: 'estimated distance',
  stat_sub_days: 'total trip days',
  stat_sub_entries: 'memories logged',

  // Map
  map_hint_desktop: 'Right-click = visited · Double-click = wish list',
  map_hint_mobile: 'World map · long-press to pin',
  map_search: 'Search country or city name...',
  map_legend_home: 'Home base',
  map_legend_lived: 'Lived here',
  map_legend_visited: 'Visited',
  map_legend_wishlist: 'Wish list',
  map_legend_unexplored: 'Not yet explored',

  // Homebase
  home_base: 'Home base',
  home_not_set: 'Not set',
  btn_change: 'Change',
  btn_set_home: 'Set home base',
  lived_places: "Places I've lived",
  btn_add_lived: "+ Place I've lived",

  // Buttons
  btn_add_trip: '+ Add Trip',
  btn_add_entry: '+ Add Entry',
  btn_save: 'Save',
  btn_cancel: 'Cancel',
  btn_delete: 'Delete',

  // Trips page
  trips_title: 'My Trips',
  trips_sub: 'Adventures logged',
  no_trips: 'No trips yet',
  no_trips_sub: 'Pin a country on the map or add a full trip below',

  // Journal page
  journal_title: 'Trip Journal',
  journal_sub: 'Travel memories',
  journal_select: 'Select a trip',
  no_entries: 'No entries yet',
  no_entries_sub: 'Start writing your memories from this trip',

  // Countdown widget
  next_trip: 'Next trip',
  currently_traveling: 'Currently traveling',
  no_upcoming: 'No upcoming trips',
  plan_adventure: 'Plan your next adventure!',
  add_upcoming_trip: '+ Add upcoming trip',
  add_trip: '+ Add trip',
  remaining: 'remaining',
  days_to_go: 'days to go',
  next_up: 'Next up',
  upcoming_trip: 'Upcoming trip',
  upcoming_trips: 'Upcoming trips',

  // Dashboard
  your_travel_story: 'Your travel story',
  countries_explored: 'countries explored',
  loading_travels: 'Loading your travels...',
  welcome_title: "Welcome aboard! Here's how to get started:",
  step_1_title: 'Set your home base',
  step_1_sub: 'Tell us where you live',
  step_2_title: 'Right-click the map',
  step_2_sub: "Pin countries you've been to",
  step_3_title: 'Add a trip',
  step_3_sub: 'Log your adventures in detail',

  // Widgets
  widget_calendar: 'Calendar',
  widget_clock: 'World Clock',
  widget_currency: 'Currency',

  // Stats page
  stats_title: 'Travel Stats',
  stats_sub: 'Your numbers',
  share_stats: 'Share Stats',
  badges_earned: 'Badges earned',
  badges_to_earn: 'Badges to earn',
  all_badges: 'All badges',
  highlights: 'Highlights',
  world_coverage: 'World coverage',
  trips_by_year: 'Trips by year',

  // Misc
  day: 'day',
  days: 'days',
  entries: 'entries',
  search: 'Search',
  close: 'Close',
};

export const PRESET_LANGS = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'lt', label: '🇱🇹 Lietuvių' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'pl', label: '🇵🇱 Polski' },
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ar', label: '🇸🇦 العربية' },
];
