/*
=========================================================
POPS PICKZ NFL — MASTER DATA BUILDER
File: scripts/build-nfl.js
Phase 1
=========================================================

CURRENT PURPOSE

- Download the NFL schedule
- Find the next upcoming regular-season week
- Save all games from that week
- Create data/upcoming-games.json

FUTURE ADDITIONS

- Team statistics
- Player statistics
- TD predictions
- Passing predictions
- Rushing predictions
- Receiving predictions
- Moneyline predictions
- Live grading
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

  /*
  Regular season = 2
  Preseason = 1
  Postseason = 3
  */

  seasonType: 2,

  maximumGames: 32
};

/*
=========================================================
FILE PATHS
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

const UPCOMING_GAMES_FILE = path.join(
  DATA_DIRECTORY,
  "upcoming-games.json"
);

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
  const result = String(
    value ?? ""
  ).trim();

  return result || fallback;
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(
      DATA_DIRECTORY,
      {
        recursive: true
      }
    );
  }
}

function writeJSON(filePath, value) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(value, null, 2),
    "utf8"
  );
}

function getCurrentNFLSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  /*
  January and February belong to the season
  that began during the previous calendar year.

  From March onward, prepare for the current
  calendar year's upcoming NFL season.
  */

  return month <= 1
    ? year - 1
    : year;
}

/*
=========================================================
NETWORK HELPER
=========================================================
*/

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "POPS-PICKZ-NFL/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/*
=========================================================
TEAM NORMALIZER
=========================================================
*/

function normalizeTeam(
  competitor,
  isHome
) {
  const team =
    competitor?.team || {};

  return {
    teamId: text(team.id),

    teamName:
      text(
        team.displayName,
        text(
          team.name,
          "NFL Team"
        )
      ),

    shortName:
      text(
        team.shortDisplayName,
        text(
          team.name,
          "NFL Team"
        )
      ),

    abbreviation:
      text(
        team.abbreviation,
        "NFL"
      ),

    logo:
      text(
        team.logo,
        text(
          team.logos?.[0]?.href
        )
      ),

    color:
      text(team.color),

    alternateColor:
      text(team.alternateColor),

    isHome,

    score:
      competitor?.score !== undefined
        ? text(competitor.score, "0")
        : "0"
  };
}

/*
=========================================================
GAME NORMALIZER
=========================================================
*/

function normalizeGame(event) {
  const competition =
    event?.competitions?.[0];

  if (!competition) {
    return null;
  }

  const competitors =
    Array.isArray(
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

  const date =
    new Date(event.date);

  const startTime =
    Number.isNaN(date.getTime())
      ? 0
      : date.getTime();

  const seasonType =
    number(
      event?.season?.type ??
      competition?.type?.id
    );

  return {
    gameId:
      text(event.id),

    season:
      number(
        event?.season?.year,
        getCurrentNFLSeason()
      ),

    seasonType,

    week:
      number(
        event?.week?.number ??
        competition?.week?.number
      ),

    name:
      text(
        event.name,
        `${
          awayCompetitor.team
            ?.displayName || "Away"
        } vs ${
          homeCompetitor.team
            ?.displayName || "Home"
        }`
      ),

    shortName:
      text(
        event.shortName
      ),

    startTime,

    date:
      startTime
        ? new Date(startTime)
            .toISOString()
        : "",

    state:
      text(
        statusType.state,
        "pre"
      ),

    completed:
      Boolean(
        statusType.completed
      ),

    status:
      text(
        statusType.shortDetail,
        text(
          statusType.detail,
          text(
            statusType.description,
            "Scheduled"
          )
        )
      ),

    venue: {
      name:
        text(
          competition?.venue
            ?.fullName
        ),

      city:
        text(
          competition?.venue
            ?.address?.city
        ),

      state:
        text(
          competition?.venue
            ?.address?.state
        ),

      indoor:
        Boolean(
          competition?.venue
            ?.indoor
        )
    },

    away:
      normalizeTeam(
        awayCompetitor,
        false
      ),

    home:
      normalizeTeam(
        homeCompetitor,
        true
      )
  };
}

/*
=========================================================
LOAD NFL SCHEDULE
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

  const data =
    await fetchJSON(url);

  const events =
    Array.isArray(data?.events)
      ? data.events
      : [];

  const games = events
    .map(normalizeGame)
    .filter(Boolean)
    .filter(game => {
      return (
        game.seasonType ===
        SETTINGS.seasonType
      );
    })
    .sort(
      (first, second) =>
        first.startTime -
        second.startTime
    );

  console.log(
    `Found ${games.length} regular-season games.`
  );

  return games;
}

/*
=========================================================
SELECT NEXT UPCOMING WEEK
=========================================================
*/

function selectUpcomingWeek(games) {
  const now = Date.now();

  const futureGames =
    games.filter(game => {
      return (
        !game.completed &&
        game.startTime >= now
      );
    });

  if (!futureGames.length) {
    return {
      week: null,
      games: []
    };
  }

  /*
  The first future game determines the next week.
  */

  const nextWeek =
    futureGames[0].week;

  let selectedGames =
    futureGames.filter(game => {
      return game.week === nextWeek;
    });

  /*
  Safety fallback in case the feed does not include
  week numbers.
  */

  if (
    !nextWeek ||
    !selectedGames.length
  ) {
    const firstGameTime =
      futureGames[0].startTime;

    const sevenDays =
      7 * 24 * 60 * 60 * 1000;

    selectedGames =
      futureGames.filter(game => {
        return (
          game.startTime >=
            firstGameTime &&
          game.startTime <
            firstGameTime +
            sevenDays
        );
      });
  }

  return {
    week:
      nextWeek || null,

    games:
      selectedGames.slice(
        0,
        SETTINGS.maximumGames
      )
  };
}

/*
=========================================================
CREATE UPCOMING GAMES FILE
=========================================================
*/

function createUpcomingGamesData(
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
    ensureDataDirectory();

    const season =
      getCurrentNFLSeason();

    const schedule =
      await loadSeasonSchedule(
        season
      );

    const upcomingWeek =
      selectUpcomingWeek(
        schedule
      );

    if (
      !upcomingWeek.games.length
    ) {
      throw new Error(
        `No upcoming regular-season NFL games were found for ${season}.`
      );
    }

    const output =
      createUpcomingGamesData(
        season,
        upcomingWeek
      );

    writeJSON(
      UPCOMING_GAMES_FILE,
      output
    );

    console.log("");
    console.log(
      "POPS NFL schedule build complete."
    );

    console.log(
      `Season: ${season}`
    );

    console.log(
      `Week: ${
        upcomingWeek.week ??
        "Upcoming slate"
      }`
    );

    console.log(
      `Games saved: ${
        upcomingWeek.games.length
      }`
    );

    console.log(
      "Created: data/upcoming-games.json"
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
RUN BUILDER
=========================================================
*/

build();