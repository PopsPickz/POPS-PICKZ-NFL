/*
=========================================================
POPS PICKZ NFL — AUTOMATIC MONEYLINE DATA
File: moneyline-data.js
=========================================================

Loads:

- data/upcoming-games.json
- data/team-stats.json

Then connects every official upcoming matchup to the
team statistics used by moneyline-formula.js.
=========================================================
*/

const NFLMoneylineData = {
  cache: {
    schedule: null,
    teamStats: null
  },

  /*
  =======================================================
  NETWORK
  =======================================================
  */

  async fetchJSON(filePath) {
    const separator =
      filePath.includes("?")
        ? "&"
        : "?";

    const response = await fetch(
      `${filePath}${separator}v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Could not load ${filePath}: ${response.status}`
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
    const top = this.number(value);
    const bottom = this.number(divisor);

    if (bottom <= 0) {
      return fallback;
    }

    return top / bottom;
  },

  normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/%/g, "percentage")
      .replace(/[^a-z0-9]/g, "");
  },

  findStat(
    statistics = {},
    aliases = [],
    fallback = 0
  ) {
    for (const alias of aliases) {
      const key =
        this.normalizeKey(alias);

      if (
        statistics[key] !== undefined
      ) {
        return this.number(
          statistics[key],
          fallback
        );
      }
    }

    return fallback;
  },

  /*
  =======================================================
  LOAD GENERATED FILES
  =======================================================
  */

  async loadSchedule() {
    if (this.cache.schedule) {
      return this.cache.schedule;
    }

    const data = await this.fetchJSON(
      "data/upcoming-games.json"
    );

    this.cache.schedule = data;

    return data;
  },

  async loadTeamStats() {
    if (this.cache.teamStats) {
      return this.cache.teamStats;
    }

    const data = await this.fetchJSON(
      "data/team-stats.json"
    );

    this.cache.teamStats = data;

    return data;
  },

  /*
  =======================================================
  BUILD FORMULA-READY TEAM DATA
  =======================================================
  */

  buildFormulaTeamData(
    gameTeam = {},
    storedTeam = {}
  ) {
    const stats =
      storedTeam.rawStatistics || {};

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

const totalPointsScored =
  this.findStat(
    stats,
    [
      "pointsFor",
      "pointsScored",
      "totalPoints",
      "teamPoints"
    ]
  );



const pointsPerGame =
  this.findStat(
    stats,
    [
      "pointsPerGame",
      "pointsScoredPerGame",
      "teamPointsPerGame",
      "scoringAverage"
    ],
    this.divide(
      totalPointsScored,
      gamesPlayed,
      22
    )
  );


    
    const passingAttempts =
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
          "interceptionsThrown",
          "passingInterceptions",
          "interceptions"
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

    

    return {
      teamId:
        String(
          gameTeam.teamId ||
          storedTeam.teamId ||
          ""
        ),

      teamName:
        gameTeam.teamName ||
        storedTeam.teamName ||
        "NFL Team",

      abbreviation:
        gameTeam.abbreviation ||
        storedTeam.abbreviation ||
        "NFL",

      logo:
        gameTeam.logo ||
        storedTeam.logo ||
        "",

      isHome:
        Boolean(gameTeam.isHome),

      passing: {
        passingYardsPerGame:
          this.divide(
            passingYards,
            gamesPlayed,
            210
          ),

        completionPercentage:
          passingAttempts > 0
            ? (
                completions /
                passingAttempts
              ) * 100
            : 62,

        passingTouchdownsPerGame:
          this.divide(
            passingTouchdowns,
            gamesPlayed,
            1.4
          ),

        interceptionsPerGame:
          this.divide(
            interceptions,
            gamesPlayed,
            0.8
          ),

        passerRating:
          this.findStat(
            stats,
            [
              "quarterbackRating",
              "passerRating",
              "teamPasserRating"
            ],
            88
          ),

        passingYardsPerAttempt:
          this.divide(
            passingYards,
            passingAttempts,
            6.8
          )
      },

      rushing: {
        rushingYardsPerGame:
          this.divide(
            rushingYards,
            gamesPlayed,
            110
          ),

        rushingYardsPerAttempt:
          this.divide(
            rushingYards,
            rushingAttempts,
            4.1
          ),

        rushingTouchdownsPerGame:
          this.divide(
            rushingTouchdowns,
            gamesPlayed,
            0.8
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
            6
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
            gamesPlayed,
            210
          ),

        receptionsPerGame:
          this.divide(
            receptions,
            gamesPlayed,
            20
          ),

        catchPercentage:
          passingAttempts > 0
            ? (
                receptions /
                passingAttempts
              ) * 100
            : 62,

        receivingTouchdownsPerGame:
          this.divide(
            receivingTouchdowns,
            gamesPlayed,
            1.4
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
            10.5
          )
      },

      defense: {
        pointsAllowedPerGame:
         this.findStat(
          stats,
       [
        "pointsAllowedPerGame",
        "opponentPointsPerGame",
        "averagePointsAllowed"
      ],
      22
    ),

        totalYardsAllowedPerGame:
          this.findStat(
            stats,
            [
              "totalYardsAllowedPerGame",
              "yardsAllowedPerGame"
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
                "totalSacks",
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

      scoring: {
        pointsPerGame,
        pointsAllowedPerGame
      }
    };
  },

  /*
  =======================================================
  LOAD ALL OFFICIAL MATCHUPS
  =======================================================
  */

  async loadMoneylineMatchups() {
    const [
      scheduleData,
      teamStatsData
    ] = await Promise.all([
      this.loadSchedule(),
      this.loadTeamStats()
    ]);

    const games =
      Array.isArray(scheduleData.games)
        ? scheduleData.games
        : [];

    const storedTeams =
      Array.isArray(teamStatsData.teams)
        ? teamStatsData.teams
        : [];

    const statsByTeamId =
      new Map(
        storedTeams.map(team => [
          String(team.teamId),
          team
        ])
      );

    const matchups = games
      .map(game => {
        const awayStored =
          statsByTeamId.get(
            String(game.away?.teamId)
          );

        const homeStored =
          statsByTeamId.get(
            String(game.home?.teamId)
          );

        if (
          !awayStored ||
          !homeStored
        ) {
          console.warn(
            "POPS NFL missing team stats:",
            game.name
          );

          return null;
        }

        return {
          gameId: game.gameId,
          name: game.name,
          shortName: game.shortName,

          week:
            game.week ||
            scheduleData.week,

          season:
            game.season ||
            scheduleData.season,

          startTime:
            game.startTime ||
            new Date(game.date).getTime(),

          date: game.date,

          state: game.state,
          completed: game.completed,
          statusText: game.status,

          away: game.away,
          home: game.home,

          awayTeamData:
            this.buildFormulaTeamData(
              {
                ...game.away,
                isHome: false
              },
              awayStored
            ),

          homeTeamData:
            this.buildFormulaTeamData(
              {
                ...game.home,
                isHome: true
              },
              homeStored
            )
        };
      })
      .filter(Boolean);

    console.log(
      `POPS NFL loaded ${matchups.length} moneyline matchups.`
    );

    if (!matchups.length) {
      throw new Error(
        "No official NFL matchups could be connected to team statistics."
      );
    }

    return matchups;
  },

  /*
  =======================================================
  FORMAT GAME TIME
  =======================================================
  */

  formatGameTime(timestamp) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
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

window.NFLMoneylineData =
  NFLMoneylineData;
