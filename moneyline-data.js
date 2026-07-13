/*
=========================================================
POPS PICKZ NFL — MONEYLINE DATA
File: moneyline-data.js
Version: 1.0
=========================================================

PURPOSE

- Loads NFL matchups
- Loads team season statistics
- Converts ESPN statistics into the structure expected by
  moneyline-formula.js
- Caches requests
- Supplies safe fallback values when a statistic is missing

OTHER FILES

moneyline-formula.js  -> scores the matchup
moneyline.js          -> renders the cards
moneyline-style.css   -> styles the cards
=========================================================
*/

const NFLMoneylineData = {
  league: "nfl",
  sport: "football",
  seasonType: 2,

  maximumGames: 16,

  teamCache: new Map(),
  statsCache: new Map(),

  /*
  =======================================================
  DATE AND SEASON HELPERS
  =======================================================
  */

  getCurrentNFLSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    /*
    January through July normally belong to the season
    that began during the previous calendar year.

    August begins preseason for the new season.
    */

    return month <= 6
      ? year - 1
      : year;
  },

  getPredictionSeason() {
    return this.getCurrentNFLSeason();
  },

  getScheduleSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    /*
    During July and later, begin looking for the upcoming
    season schedule.
    */

    return month >= 6
      ? year
      : year - 1;
  },

  /*
  =======================================================
  NETWORK HELPERS
  =======================================================
  */

  async fetchJSON(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `NFL data request failed: ${response.status}`
      );
    }

    return response.json();
  },

  number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  },

  divide(value, divisor, fallback = 0) {
    const first = this.number(value);
    const second = this.number(divisor);

    if (second <= 0) {
      return fallback;
    }

    return first / second;
  },

  /*
  =======================================================
  LOAD NFL TEAMS
  =======================================================
  */

  async loadTeams() {
    if (this.teamCache.size) {
      return Array.from(
        this.teamCache.values()
      );
    }

    const url =
      "https://site.api.espn.com/apis/site/v2/" +
      "sports/football/nfl/teams?limit=100";

    const data = await this.fetchJSON(url);

    const league =
      data?.sports?.[0]?.leagues?.[0];

    const teams = Array.isArray(league?.teams)
      ? league.teams
      : [];

    teams.forEach(item => {
      const team = item?.team || item;

      if (!team?.id) {
        return;
      }

      const normalizedTeam = {
        id: String(team.id),

        uid: team.uid || "",

        slug: team.slug || "",

        abbreviation:
          team.abbreviation ||
          team.shortDisplayName ||
          "NFL",

        displayName:
          team.displayName ||
          team.name ||
          "NFL Team",

        shortDisplayName:
          team.shortDisplayName ||
          team.name ||
          "NFL",

        location:
          team.location || "",

        nickname:
          team.name || "",

        color:
          team.color || "",

        alternateColor:
          team.alternateColor || "",

        logo:
          team.logos?.[0]?.href ||
          team.logo ||
          ""
      };

      this.teamCache.set(
        normalizedTeam.id,
        normalizedTeam
      );
    });

    return Array.from(
      this.teamCache.values()
    );
  },

  async getTeam(teamId) {
    await this.loadTeams();

    return (
      this.teamCache.get(String(teamId)) ||
      null
    );
  },

  /*
  =======================================================
  LOAD MATCHUPS
  =======================================================
  */

  async loadMatchups() {
    const season = this.getScheduleSeason();

    const url =
      "https://site.api.espn.com/apis/site/v2/" +
      "sports/football/nfl/scoreboard" +
      `?dates=${season}&limit=1000`;

    const data = await this.fetchJSON(url);

    const events = Array.isArray(data?.events)
      ? data.events
      : [];

    const games = events
      .map(event => this.normalizeMatchup(event))
      .filter(Boolean);

    return this.selectRelevantMatchups(games);
  },

  normalizeMatchup(event) {
    const competition =
      event?.competitions?.[0];

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

    const startDate =
      new Date(event.date);

    const status =
      competition.status ||
      event.status ||
      {};

    const statusType =
      status.type || {};

    return {
      gameId: event.id || "",

      name:
        event.name ||
        `${awayCompetitor.team?.displayName || "Away"} vs ` +
        `${homeCompetitor.team?.displayName || "Home"}`,

      startTime:
        Number.isNaN(startDate.getTime())
          ? 0
          : startDate.getTime(),

      state:
        statusType.state || "pre",

      completed:
        Boolean(statusType.completed),

      statusText:
        statusType.shortDetail ||
        statusType.detail ||
        statusType.description ||
        "Scheduled",

      week:
        event.week?.number ||
        competition.week?.number ||
        "",

      season:
        event.season?.year ||
        this.getScheduleSeason(),

      away: this.normalizeGameTeam(
        awayCompetitor,
        false
      ),

      home: this.normalizeGameTeam(
        homeCompetitor,
        true
      )
    };
  },

  normalizeGameTeam(
    competitor,
    isHome
  ) {
    const team =
      competitor?.team || {};

    return {
      teamId: String(team.id || ""),

      teamName:
        team.displayName ||
        team.name ||
        "NFL Team",

      abbreviation:
        team.abbreviation ||
        team.shortDisplayName ||
        "NFL",

      logo:
        team.logo ||
        team.logos?.[0]?.href ||
        "",

      score:
        competitor.score !== undefined
          ? String(competitor.score)
          : "0",

      isHome
    };
  },

  selectRelevantMatchups(games) {
    const now = Date.now();

    const liveGames = games
      .filter(game => game.state === "in")
      .sort(
        (first, second) =>
          first.startTime -
          second.startTime
      );

    if (liveGames.length) {
      return liveGames.slice(
        0,
        this.maximumGames
      );
    }

    const todayGames = games
      .filter(game =>
        this.isSameDate(
          game.startTime,
          now
        )
      )
      .sort(
        (first, second) =>
          first.startTime -
          second.startTime
      );

    if (todayGames.length) {
      return todayGames.slice(
        0,
        this.maximumGames
      );
    }

    const upcomingGames = games
      .filter(game => {
        return (
          game.state === "pre" &&
          game.startTime >= now
        );
      })
      .sort(
        (first, second) =>
          first.startTime -
          second.startTime
      );

    if (upcomingGames.length) {
      return upcomingGames.slice(
        0,
        this.maximumGames
      );
    }

    return games
      .filter(game => game.completed)
      .sort(
        (first, second) =>
          second.startTime -
          first.startTime
      )
      .slice(0, this.maximumGames);
  },

  /*
  =======================================================
  LOAD TEAM SEASON STATISTICS
  =======================================================
  */

  async loadTeamStatistics(
    teamId,
    season = this.getPredictionSeason()
  ) {
    const cacheKey =
      `${season}-${teamId}`;

    if (
      this.statsCache.has(cacheKey)
    ) {
      return this.statsCache.get(
        cacheKey
      );
    }

    const url =
      "https://sports.core.api.espn.com/v2/" +
      "sports/football/leagues/nfl/" +
      `seasons/${season}/types/${this.seasonType}/` +
      `teams/${teamId}/statistics`;

    const data = await this.fetchJSON(url);

    const flatStats =
      this.flattenStatistics(data);

    const team =
      await this.getTeam(teamId);

    const normalized =
      this.buildFormulaTeamData(
        team,
        flatStats
      );

    this.statsCache.set(
      cacheKey,
      normalized
    );

    return normalized;
  },

  /*
  =======================================================
  FLATTEN ESPN STATISTICS

  ESPN returns several statistical categories. This turns
  them into one searchable object.
  =======================================================
  */

  flattenStatistics(data) {
    const result = {};

    const categories = Array.isArray(
      data?.splits?.categories
    )
      ? data.splits.categories
      : Array.isArray(data?.categories)
        ? data.categories
        : [];

    categories.forEach(category => {
      const stats = Array.isArray(
        category?.stats
      )
        ? category.stats
        : [];

      stats.forEach(stat => {
        const keys = [
          stat.name,
          stat.displayName,
          stat.shortDisplayName,
          stat.abbreviation
        ]
          .filter(Boolean)
          .map(value =>
            this.normalizeKey(value)
          );

        const value =
          stat.value ??
          stat.displayValue ??
          stat.perGameValue ??
          0;

        keys.forEach(key => {
          if (
            key &&
            result[key] === undefined
          ) {
            result[key] =
              this.parseStatValue(value);
          }
        });
      });
    });

    /*
    Also inspect nested structures in case ESPN changes the
    category placement.
    */

    this.walkStatistics(
      data,
      result
    );

    return result;
  },

  walkStatistics(value, result) {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return;
    }

    if (
      value.name &&
      (
        value.value !== undefined ||
        value.displayValue !== undefined
      )
    ) {
      const key =
        this.normalizeKey(
          value.name
        );

      if (
        key &&
        result[key] === undefined
      ) {
        result[key] =
          this.parseStatValue(
            value.value ??
            value.displayValue
          );
      }
    }

    Object.values(value).forEach(
      child => {
        if (
          child &&
          typeof child === "object"
        ) {
          this.walkStatistics(
            child,
            result
          );
        }
      }
    );
  },

  normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/%/g, "percentage")
      .replace(/[^a-z0-9]/g, "");
  },

  parseStatValue(value) {
    if (
      typeof value === "number"
    ) {
      return value;
    }

    const cleaned = String(
      value ?? ""
    )
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim();

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  },

  /*
  =======================================================
  FIND A STAT USING MULTIPLE POSSIBLE NAMES
  =======================================================
  */

  findStat(
    stats,
    aliases,
    fallback = 0
  ) {
    for (
      const alias of aliases
    ) {
      const key =
        this.normalizeKey(alias);

      if (
        stats[key] !== undefined
      ) {
        return this.number(
          stats[key],
          fallback
        );
      }
    }

    return fallback;
  },

  /*
  =======================================================
  BUILD FORMULA-READY TEAM DATA
  =======================================================
  */

  buildFormulaTeamData(
    team,
    stats
  ) {
    const gamesPlayed =
      this.findStat(
        stats,
        [
          "gamesPlayed",
          "games",
          "teamGamesPlayed"
        ],
        17
      ) || 17;

    const passAttempts =
      this.findStat(
        stats,
        [
          "passingAttempts",
          "passAttempts",
          "attempts"
        ]
      );

    const completions =
      this.findStat(
        stats,
        [
          "completions",
          "passingCompletions"
        ]
      );

    const passingYards =
      this.findStat(
        stats,
        [
          "passingYards",
          "netPassingYards"
        ]
      );

    const passingTouchdowns =
      this.findStat(
        stats,
        [
          "passingTouchdowns",
          "passingTDs",
          "passTouchdowns"
        ]
      );

    const interceptions =
      this.findStat(
        stats,
        [
          "interceptions",
          "interceptionsThrown"
        ]
      );

    const rushingAttempts =
      this.findStat(
        stats,
        [
          "rushingAttempts",
          "rushAttempts"
        ]
      );

    const rushingYards =
      this.findStat(
        stats,
        [
          "rushingYards",
          "rushYards"
        ]
      );

    const rushingTouchdowns =
      this.findStat(
        stats,
        [
          "rushingTouchdowns",
          "rushingTDs"
        ]
      );

    const receptions =
      this.findStat(
        stats,
        [
          "receptions",
          "teamReceptions"
        ],
        completions
      );

    const receivingYards =
      this.findStat(
        stats,
        [
          "receivingYards",
          "teamReceivingYards"
        ],
        passingYards
      );

    const receivingTouchdowns =
      this.findStat(
        stats,
        [
          "receivingTouchdowns",
          "receivingTDs"
        ],
        passingTouchdowns
      );

    const sacksAllowed =
      this.findStat(
        stats,
        [
          "sacksAllowed",
          "timesSacked",
          "sacks"
        ]
      );

    const fieldGoalsMade =
      this.findStat(
        stats,
        [
          "fieldGoalsMade",
          "fieldGoalMade"
        ]
      );

    const fieldGoalsAttempted =
      this.findStat(
        stats,
        [
          "fieldGoalsAttempted",
          "fieldGoalAttempts"
        ]
      );

    const extraPointsMade =
      this.findStat(
        stats,
        [
          "extraPointsMade",
          "extraPointMade"
        ]
      );

    const extraPointsAttempted =
      this.findStat(
        stats,
        [
          "extraPointsAttempted",
          "extraPointAttempts"
        ]
      );

    return {
      teamId:
        team?.id || "",

      teamName:
        team?.displayName ||
        "NFL Team",

      abbreviation:
        team?.abbreviation ||
        "NFL",

      logo:
        team?.logo || "",

      passing: {
        passingYardsPerGame:
          this.divide(
            passingYards,
            gamesPlayed
          ),

        completionPercentage:
          passAttempts > 0
            ? (
                completions /
                passAttempts
              ) * 100
            : 60,

        passingTouchdownsPerGame:
          this.divide(
            passingTouchdowns,
            gamesPlayed
          ),

        interceptionsPerGame:
          this.divide(
            interceptions,
            gamesPlayed
          ),

        passerRating:
          this.findStat(
            stats,
            [
              "quarterbackRating",
              "passerRating",
              "teamPasserRating"
            ],
            85
          ),

        passingYardsPerAttempt:
          this.divide(
            passingYards,
            passAttempts,
            6.5
          )
      },

      rushing: {
        rushingYardsPerGame:
          this.divide(
            rushingYards,
            gamesPlayed
          ),

        rushingYardsPerAttempt:
          this.divide(
            rushingYards,
            rushingAttempts,
            4
          ),

        rushingTouchdownsPerGame:
          this.divide(
            rushingTouchdowns,
            gamesPlayed
          ),

        rushingFirstDownsPerGame:
          this.divide(
            this.findStat(
              stats,
              [
                "rushingFirstDowns",
                "rushFirstDowns"
              ]
            ),
            gamesPlayed,
            5
          ),

        explosiveRushPercentage:
          this.findStat(
            stats,
            [
              "explosiveRushPercentage",
              "bigRushPlayPercentage"
            ],
            10
          )
      },

      receiving: {
        receivingYardsPerGame:
          this.divide(
            receivingYards,
            gamesPlayed
          ),

        receptionsPerGame:
          this.divide(
            receptions,
            gamesPlayed
          ),

        catchPercentage:
          passAttempts > 0
            ? (
                receptions /
                passAttempts
              ) * 100
            : 62,

        receivingTouchdownsPerGame:
          this.divide(
            receivingTouchdowns,
            gamesPlayed
          ),

        yardsAfterCatchPerGame:
          this.divide(
            this.findStat(
              stats,
              [
                "yardsAfterCatch",
                "receivingYardsAfterCatch"
              ]
            ),
            gamesPlayed,
            95
          ),

        yardsPerReception:
          this.divide(
            receivingYards,
            receptions,
            10
          )
      },

      defense: {
        pointsAllowedPerGame:
          this.findStat(
            stats,
            [
              "pointsAllowedPerGame",
              "opponentPointsPerGame"
            ],
            this.divide(
              this.findStat(
                stats,
                [
                  "pointsAllowed",
                  "opponentPoints"
                ]
              ),
              gamesPlayed,
              22
            )
          ),

        totalYardsAllowedPerGame:
          this.findStat(
            stats,
            [
              "yardsAllowedPerGame",
              "totalYardsAllowedPerGame"
            ],
            340
          ),

        passingYardsAllowedPerGame:
          this.findStat(
            stats,
            [
              "passingYardsAllowedPerGame",
              "opponentPassingYardsPerGame"
            ],
            220
          ),

        rushingYardsAllowedPerGame:
          this.findStat(
            stats,
            [
              "rushingYardsAllowedPerGame",
              "opponentRushingYardsPerGame"
            ],
            115
          ),

        sacksPerGame:
          this.divide(
            this.findStat(
              stats,
              [
                "defensiveSacks",
                "sacks"
              ]
            ),
            gamesPlayed,
            2.4
          ),

        takeawaysPerGame:
          this.divide(
            this.findStat(
              stats,
              [
                "takeaways",
                "totalTakeaways"
              ]
            ),
            gamesPlayed,
            1.2
          ),

        thirdDownPercentageAllowed:
          this.findStat(
            stats,
            [
              "thirdDownPercentageAllowed",
              "opponentThirdDownConversionPercentage"
            ],
            39
          )
      },

      specialTeams: {
        fieldGoalPercentage:
          fieldGoalsAttempted > 0
            ? (
                fieldGoalsMade /
                fieldGoalsAttempted
              ) * 100
            : 82,

        extraPointPercentage:
          extraPointsAttempted > 0
            ? (
                extraPointsMade /
                extraPointsAttempted
              ) * 100
            : 94,

        netPuntAverage:
          this.findStat(
            stats,
            [
              "netPuntAverage",
              "netPuntingAverage"
            ],
            41
          ),

        kickReturnAverage:
          this.findStat(
            stats,
            [
              "kickReturnAverage",
              "kickoffReturnAverage"
            ],
            22
          ),

        puntReturnAverage:
          this.findStat(
            stats,
            [
              "puntReturnAverage"
            ],
            9
          ),

        specialTeamsTouchdowns:
          this.findStat(
            stats,
            [
              "specialTeamsTouchdowns",
              "returnTouchdowns"
            ],
            0
          )
      },

      offensiveLine: {
        sacksAllowedPerGame:
          this.divide(
            sacksAllowed,
            gamesPlayed,
            2.5
          ),

        pressurePercentageAllowed:
          this.findStat(
            stats,
            [
              "pressurePercentageAllowed",
              "pressureRateAllowed"
            ],
            30
          ),

        quarterbackHitsAllowedPerGame:
          this.divide(
            this.findStat(
              stats,
              [
                "quarterbackHitsAllowed",
                "qbHitsAllowed"
              ]
            ),
            gamesPlayed,
            5.5
          ),

        rushingYardsBeforeContact:
          this.findStat(
            stats,
            [
              "rushingYardsBeforeContact",
              "yardsBeforeContactPerRush"
            ],
            1.4
          ),

        passBlockWinRate:
          this.findStat(
            stats,
            [
              "passBlockWinRate",
              "passBlockingWinRate"
            ],
            60
          ),

        runBlockWinRate:
          this.findStat(
            stats,
            [
              "runBlockWinRate",
              "runBlockingWinRate"
            ],
            68
          )
      }
    };
  },

  /*
  =======================================================
  BUILD COMPLETE MATCHUPS WITH TEAM STATISTICS
  =======================================================
  */

  async loadMoneylineMatchups() {
    await this.loadTeams();

    const matchups =
      await this.loadMatchups();

    const season =
      this.getPredictionSeason();

    const loadedMatchups =
      await Promise.all(
        matchups.map(
          async matchup => {
            try {
              const [
                awayStats,
                homeStats
              ] = await Promise.all([
                this.loadTeamStatistics(
                  matchup.away.teamId,
                  season
                ),

                this.loadTeamStatistics(
                  matchup.home.teamId,
                  season
                )
              ]);

              return {
                ...matchup,

                awayTeamData: {
                  ...awayStats,
                  isHome: false
                },

                homeTeamData: {
                  ...homeStats,
                  isHome: true
                }
              };
            } catch (error) {
              console.warn(
                `Moneyline data failed for ${matchup.name}:`,
                error
              );

              return null;
            }
          }
        )
      );

    return loadedMatchups.filter(Boolean);
  },

  /*
  =======================================================
  HELPERS
  =======================================================
  */

  isSameDate(
    firstTimestamp,
    secondTimestamp
  ) {
    const first =
      new Date(firstTimestamp);

    const second =
      new Date(secondTimestamp);

    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    );
  },

  formatGameTime(timestamp) {
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Time TBD";
    }

    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }
};

/*
=========================================================
MAKE DATA LOADER AVAILABLE TO OTHER FILES
=========================================================
*/

window.NFLMoneylineData =
  NFLMoneylineData;
