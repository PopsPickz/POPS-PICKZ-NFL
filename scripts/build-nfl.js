/*
=========================================================
POPS PICKZ NFL — MASTER DATA BUILDER
File: scripts/build-nfl.js
Phase 2 — Foundation
=========================================================

CURRENT OUTPUTS

1. data/upcoming-games.json
2. data/teams.json

NEXT ADDITIONS

- Team statistics
- Player statistics
- Rosters
- TD projections
- Passing projections
- Rushing projections
- Receiving projections
- Moneyline predictions
- Live tracking
- Weekly and season records
=========================================================
*/

const fs = require("fs");
const path = require("path");

/*
=========================================================
SETTINGS
=========================================================
*/

const SETTINGS = {
  sport: "football",
  league: "nfl",

  seasonTypes: {
    preseason: 1,
    regular: 2,
    postseason: 3
  },

  maximumGames: 32,

  requestDelayMilliseconds: 100
};

/*
=========================================================
DIRECTORIES AND FILES
=========================================================
*/

const ROOT_DIRECTORY = path.resolve(
  __dirname,
  ".."
);

const DATA_DIRECTORY = path.join(
  ROOT_DIRECTORY,
  "data"
);

const FILES = {
  upcomingGames: path.join(
    DATA_DIRECTORY,
    "upcoming-games.json"
  ),

  teams: path.join(
    DATA_DIRECTORY,
    "teams.json"
  ),

  teamStats: path.join(
    DATA_DIRECTORY,
    "team-stats.json"
  )
};

/*
=========================================================
GENERAL HELPERS
=========================================================
*/

function number(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function text(value, fallback = "") {
  const cleaned = String(
    value ?? ""
  ).trim();

  return cleaned || fallback;
}

function boolean(value) {
  return Boolean(value);
}

function unique(values = []) {
  return Array.from(
    new Set(values)
  );
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, {
      recursive: true
    });
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function getCurrentNFLSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  /*
  January and February are part of the NFL season
  that began during the previous calendar year.

  From March forward, prepare for the upcoming season
  named for the current calendar year.
  */

  return month <= 1
    ? year - 1
    : year;
}

function safeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/*
=========================================================
NETWORK HELPER
=========================================================
*/

async function fetchJSON(
  url,
  options = {}
) {
  const response = await fetch(url, {
    cache: "no-store",

    headers: {
      Accept: "application/json",

      "User-Agent":
        "POPS-PICKZ-NFL/2.0",

      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ` +
      `${response.statusText} — ${url}`
    );
  }

  return response.json();
}

/*
=========================================================
TEAM NORMALIZATION
=========================================================
*/

function normalizeTeamRecord(team = {}) {
  const logos = Array.isArray(team.logos)
    ? team.logos
    : [];

  return {
    teamId: text(team.id),

    uid: text(team.uid),

    slug: text(team.slug),

    abbreviation: text(
      team.abbreviation,
      text(team.shortDisplayName, "NFL")
    ),

    teamName: text(
      team.displayName,
      text(team.name, "NFL Team")
    ),

    shortName: text(
      team.shortDisplayName,
      text(team.name, "NFL Team")
    ),

    location: text(team.location),

    nickname: text(team.name),

    color: text(team.color),

    alternateColor: text(
      team.alternateColor
    ),

    logo: text(
      team.logo,
      text(logos[0]?.href)
    ),

    links: Array.isArray(team.links)
      ? team.links
          .map(link => ({
            rel: Array.isArray(link.rel)
              ? link.rel
              : [],

            href: text(link.href),

            text: text(link.text)
          }))
          .filter(link => link.href)
      : []
  };
}

function normalizeGameTeam(
  competitor = {},
  isHome = false
) {
  const team = competitor.team || {};

  return {
    teamId: text(team.id),

    teamName: text(
      team.displayName,
      text(team.name, "NFL Team")
    ),

    shortName: text(
      team.shortDisplayName,
      text(team.name, "NFL Team")
    ),

    abbreviation: text(
      team.abbreviation,
      "NFL"
    ),

    logo: text(
      team.logo,
      text(team.logos?.[0]?.href)
    ),

    color: text(team.color),

    alternateColor: text(
      team.alternateColor
    ),

    isHome,

    score:
      competitor.score !== undefined
        ? text(competitor.score, "0")
        : "0",

    winner: boolean(competitor.winner),

    record: text(
      competitor.records?.[0]?.summary
    )
  };
}

/*
=========================================================
GAME NORMALIZATION
=========================================================
*/

function normalizeGame(event = {}) {
  const competition =
    event.competitions?.[0];

  if (!competition) {
    return null;
  }

  const competitors = Array.isArray(
    competition.competitors
  )
    ? competition.competitors
    : [];

  const awayCompetitor =
    competitors.find(
      competitor =>
        competitor.homeAway === "away"
    );

  const homeCompetitor =
    competitors.find(
      competitor =>
        competitor.homeAway === "home"
    );

  if (
    !awayCompetitor ||
    !homeCompetitor
  ) {
    return null;
  }

  const status =
    competition.status ||
    event.status ||
    {};

  const statusType =
    status.type || {};

  const startDate =
    safeDate(event.date);

  const startTime =
    startDate
      ? startDate.getTime()
      : 0;

  return {
    gameId: text(event.id),

    season: number(
      event.season?.year,
      getCurrentNFLSeason()
    ),

    seasonType: number(
      event.season?.type ??
      competition.type?.id
    ),

    week: number(
      event.week?.number ??
      competition.week?.number
    ),

    name: text(
      event.name,
      `${
        awayCompetitor.team
          ?.displayName || "Away"
      } at ${
        homeCompetitor.team
          ?.displayName || "Home"
      }`
    ),

    shortName: text(event.shortName),

    date:
      startDate
        ? startDate.toISOString()
        : "",

    startTime,

    state: text(
      statusType.state,
      "pre"
    ),

    completed: boolean(
      statusType.completed
    ),

    status: text(
      statusType.shortDetail,
      text(
        statusType.detail,
        text(
          statusType.description,
          "Scheduled"
        )
      )
    ),

    period: number(status.period),

    clock: text(
      status.displayClock
    ),

    neutralSite: boolean(
      competition.neutralSite
    ),

    conferenceCompetition:
      boolean(
        competition.conferenceCompetition
      ),

    attendance: number(
      competition.attendance
    ),

    venue: {
      name: text(
        competition.venue?.fullName
      ),

      city: text(
        competition.venue
          ?.address?.city
      ),

      state: text(
        competition.venue
          ?.address?.state
      ),

      indoor: boolean(
        competition.venue?.indoor
      ),

      grass: boolean(
        competition.venue?.grass
      )
    },

    broadcasts: Array.isArray(
      competition.broadcasts
    )
      ? unique(
          competition.broadcasts.flatMap(
            broadcast =>
              Array.isArray(
                broadcast.names
              )
                ? broadcast.names
                : []
          )
        )
      : [],

    away: normalizeGameTeam(
      awayCompetitor,
      false
    ),

    home: normalizeGameTeam(
      homeCompetitor,
      true
    )
  };
}

/*
=========================================================
LOAD ALL NFL TEAMS
=========================================================
*/

async function loadNFLTeams() {
  const url =
    "https://site.api.espn.com/" +
    "apis/site/v2/sports/" +
    `${SETTINGS.sport}/` +
    `${SETTINGS.league}/teams` +
    "?limit=100";

  console.log(
    "Loading NFL teams..."
  );

  const data = await fetchJSON(url);

  const league =
    data?.sports?.[0]?.leagues?.[0];

  const rawTeams =
    Array.isArray(league?.teams)
      ? league.teams
      : [];

  const teams = rawTeams
    .map(item =>
      normalizeTeamRecord(
        item.team || item
      )
    )
    .filter(team => team.teamId)
    .sort((first, second) =>
      first.teamName.localeCompare(
        second.teamName
      )
    );

  console.log(
    `Loaded ${teams.length} NFL teams.`
  );

  return teams;
}

/*
=========================================================
LOAD NFL SEASON SCHEDULE
=========================================================
*/

async function loadSeasonSchedule(
  season
) {
  const url =
    "https://site.api.espn.com/" +
    "apis/site/v2/sports/" +
    `${SETTINGS.sport}/` +
    `${SETTINGS.league}/` +
    "scoreboard" +
    `?dates=${season}` +
    "&limit=1000";

  console.log(
    `Loading NFL ${season} schedule...`
  );

  const data = await fetchJSON(url);

  const events =
    Array.isArray(data.events)
      ? data.events
      : [];

  const games = events
    .map(normalizeGame)
    .filter(Boolean)
    .sort(
      (first, second) =>
        first.startTime -
        second.startTime
    );

  console.log(
    `Loaded ${games.length} total games.`
  );

  return games;
}

/*
=========================================================
SELECT THE NEXT REGULAR-SEASON SLATE
=========================================================
*/

function selectUpcomingWeek(games = []) {
  const now = Date.now();

  const regularSeasonGames =
    games.filter(game => {
      return (
        game.seasonType ===
        SETTINGS.seasonTypes.regular
      );
    });

  /*
  Include games that are live or scheduled in the future.
  */

  const availableGames =
    regularSeasonGames
      .filter(game => {
        return (
          game.state === "in" ||
          (
            !game.completed &&
            game.startTime >= now
          )
        );
      })
      .sort(
        (first, second) =>
          first.startTime -
          second.startTime
      );

  if (!availableGames.length) {
    return {
      week: null,
      games: []
    };
  }

  const firstGame =
    availableGames[0];

  const selectedWeek =
    firstGame.week;

  let selectedGames =
    availableGames.filter(game => {
      return (
        selectedWeek > 0 &&
        game.week === selectedWeek
      );
    });

  /*
  Fallback when week numbers are missing.
  Select games within seven days of the next game.
  */

  if (!selectedGames.length) {
    const sevenDays =
      7 * 24 * 60 * 60 * 1000;

    selectedGames =
      availableGames.filter(game => {
        return (
          game.startTime >=
            firstGame.startTime &&
          game.startTime <
            firstGame.startTime +
            sevenDays
        );
      });
  }

  return {
    week:
      selectedWeek || null,

    games: selectedGames.slice(
      0,
      SETTINGS.maximumGames
    )
  };
}

/*
=========================================================
CREATE OUTPUT OBJECTS
=========================================================
*/

function createTeamsOutput(
  season,
  teams
) {
  return {
    generatedAt:
      new Date().toISOString(),

    season,

    teamCount: teams.length,

    source:
      "ESPN team feed",

    teams
  };
}

function createUpcomingGamesOutput(
  season,
  selection
) {
  return {
    generatedAt:
      new Date().toISOString(),

    season,

    seasonType:
      "regular",

    week:
      selection.week,

    gameCount:
      selection.games.length,

    source:
      "ESPN schedule feed",

    games:
      selection.games
  };
}

/*
=========================================================
MAIN BUILD
=========================================================
*/

async function build() {
  try {
    ensureDirectory(
      DATA_DIRECTORY
    );

    const season =
      getCurrentNFLSeason();

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "POPS PICKZ NFL DATA BUILD"
    );

    console.log(
      "======================================"
    );

    console.log(
      `Season: ${season}`
    );

    console.log("");

    /*
    Load teams and schedule.
    */

    const teams =
      await loadNFLTeams();

    await wait(
      SETTINGS.requestDelayMilliseconds
    );

    const schedule =
      await loadSeasonSchedule(
        season
      );

    /*
    Select the next week.
    */

    const upcomingSelection =
      selectUpcomingWeek(
        schedule
      );

    if (
      !upcomingSelection.games.length
    ) {
      throw new Error(
        `No upcoming regular-season NFL games ` +
        `were found for ${season}.`
      );
    }

    /*
    Build output objects.
    */

    const teamsOutput =
      createTeamsOutput(
        season,
        teams
      );

    const upcomingGamesOutput =
      createUpcomingGamesOutput(
        season,
        upcomingSelection
      );

    /*
    Write files.
    */

    writeJSON(
      FILES.teams,
      teamsOutput
    );

    writeJSON(
      FILES.upcomingGames,
      upcomingGamesOutput
    );

    console.log("");
    console.log(
      "FILES CREATED"
    );

    console.log(
      `✓ data/teams.json (${teams.length} teams)`
    );

    console.log(
      `✓ data/upcoming-games.json ` +
      `(${upcomingSelection.games.length} games)`
    );

    console.log("");
    console.log(
      `Upcoming week: ${
        upcomingSelection.week ??
        "Upcoming slate"
      }`
    );

    console.log("");
    console.log(
      "POPS NFL build completed successfully."
    );
  } catch (error) {
    console.error("");
    console.error(
      "POPS NFL build failed:"
    );

    console.error(
      error?.stack ||
      error?.message ||
      error
    );

    process.exitCode = 1;
  }
}

/*
=========================================================
RUN
=========================================================
*/

build();
