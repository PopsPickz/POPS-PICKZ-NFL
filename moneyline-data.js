/*
=========================================================
POPS PICKZ NFL — AUTOMATIC MONEYLINE DATA
File: moneyline-data.js
Version: 2.0 — TEAM RANKINGS
=========================================================

LOADS

- data/upcoming-games.json
- data/team-stats.json

AUTOMATIC RANKINGS

- Passing rank
- Rushing rank
- Receiving rank
- Defense rank
- Average points per game rank

RANKING RULES

- Passing: Higher passing yards per game is better
- Rushing: Higher rushing yards per game is better
- Receiving: Higher receiving yards per game is better
- Defense: Lower points allowed per game is better
- Points/Game: Higher points per game is better

All rankings are calculated using every team available
inside data/team-stats.json.

Rank No. 1 is the best ranking.
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

  /*
  =======================================================
  GENERAL HELPERS
  =======================================================
  */

  number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  },

  divide(value, divisor, fallback = 0) {
    const top =
      this.number(value);

    const bottom =
      this.number(divisor);

    if (bottom <= 0) {
      return fallback;
    }

    return top / bottom;
  },

  round(value, decimals = 1) {
    const multiplier =
      10 ** decimals;

    return (
      Math.round(
        this.number(value) *
        multiplier
      ) / multiplier
    );
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
        statistics[key] !== undefined &&
        statistics[key] !== null &&
        statistics[key] !== ""
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

    const data =
      await this.fetchJSON(
        "data/upcoming-games.json"
      );

    this.cache.schedule =
      data;

    return data;
  },

  async loadTeamStats() {
    if (this.cache.teamStats) {
      return this.cache.teamStats;
    }

    const data =
      await this.fetchJSON(
        "data/team-stats.json"
      );

    this.cache.teamStats =
      data;

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

    /*
    =====================================================
    SCORING
    =====================================================
    */

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

    const totalPointsAllowed =
      this.findStat(
        stats,
        [
          "pointsAgainst",
          "pointsAllowed",
          "totalPointsAllowed",
          "opponentPoints"
        ]
      );

    const pointsAllowedPerGame =
      this.findStat(
        stats,
        [
          "pointsAllowedPerGame",
          "opponentPointsPerGame",
          "averagePointsAllowed",
          "pointsAgainstPerGame"
        ],
        this.divide(
          totalPointsAllowed,
          gamesPlayed,
          22
        )
      );

    /*
    =====================================================
    PASSING
    =====================================================
    */

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
          "netPassingYards",
          "teamPassingYards"
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

    /*
    =====================================================
    RUSHING
    =====================================================
    */

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
          "rushYards",
          "teamRushingYards"
        ]
      );

    const rushingTouchdowns =
      this.findStat(
        stats,
        [
          "rushingTouchdowns",
          "rushingTDs",
          "rushTouchdowns"
        ]
      );

    /*
    =====================================================
    RECEIVING
    =====================================================
    */

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

    /*
    =====================================================
    RETURN COMPLETE TEAM DATA
    =====================================================
    */

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
        storedTeam.name ||
        "NFL Team",

      abbreviation:
        gameTeam.abbreviation ||
        storedTeam.abbreviation ||
        storedTeam.abbrev ||
        "NFL",

      logo:
        gameTeam.logo ||
        storedTeam.logo ||
        "",

      isHome:
        Boolean(
          gameTeam.isHome
        ),

      gamesPlayed,

      /*
      ===================================================
      PASSING DATA
      ===================================================
      */

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

      /*
      ===================================================
      RUSHING DATA
      ===================================================
      */

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

      /*
      ===================================================
      RECEIVING DATA
      ===================================================
      */

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

      /*
      ===================================================
      DEFENSE DATA
      ===================================================
      */

      defense: {
        pointsAllowedPerGame,

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

      /*
      ===================================================
      SCORING DATA
      ===================================================
      */

      scoring: {
        pointsPerGame,
        pointsAllowedPerGame
      }
    };
  },

  /*
  =======================================================
  CREATE ONE CATEGORY RANKING

  The same statistical value receives the same rank.

  Example:

  Team A: 300 yards = Rank 1
  Team B: 290 yards = Rank 2
  Team C: 290 yards = Rank 2
  Team D: 275 yards = Rank 4
  =======================================================
  */

  createCategoryRankings(
    teams = [],
    valueGetter,
    higherIsBetter = true
  ) {
    const validTeams =
      Array.isArray(teams)
        ? teams.filter(
            team =>
              team &&
              String(
                team.teamId || ""
              )
          )
        : [];

    const sortedTeams =
      [...validTeams].sort(
        (first, second) => {
          const firstValue =
            this.number(
              valueGetter(first)
            );

          const secondValue =
            this.number(
              valueGetter(second)
            );

          if (higherIsBetter) {
            return (
              secondValue -
              firstValue
            );
          }

          return (
            firstValue -
            secondValue
          );
        }
      );

    const rankings =
      new Map();

    let previousValue =
      null;

    let previousRank =
      0;

    sortedTeams.forEach(
      (team, index) => {
        const value =
          this.round(
            valueGetter(team),
            4
          );

        let rank =
          index + 1;

        if (
          previousValue !== null &&
          Math.abs(
            value -
            previousValue
          ) < 0.0001
        ) {
          rank =
            previousRank;
        }

        rankings.set(
          String(team.teamId),
          {
            rank,
            value
          }
        );

        previousValue =
          value;

        previousRank =
          rank;
      }
    );

    return rankings;
  },

  /*
  =======================================================
  BUILD ALL NFL TEAM RANKINGS
  =======================================================
  */

  buildRankedTeams(storedTeams = []) {
    const formulaTeams =
      storedTeams
        .map(team =>
          this.buildFormulaTeamData(
            {
              teamId:
                team.teamId,

              teamName:
                team.teamName ||
                team.name,

              abbreviation:
                team.abbreviation ||
                team.abbrev,

              logo:
                team.logo,

              isHome: false
            },
            team
          )
        )
        .filter(
          team =>
            String(
              team.teamId || ""
            )
        );

    /*
    Passing rank:
    Higher passing yards per game is better.
    */

    const passingRankings =
      this.createCategoryRankings(
        formulaTeams,
        team =>
          team.passing
            ?.passingYardsPerGame,
        true
      );

    /*
    Rushing rank:
    Higher rushing yards per game is better.
    */

    const rushingRankings =
      this.createCategoryRankings(
        formulaTeams,
        team =>
          team.rushing
            ?.rushingYardsPerGame,
        true
      );

    /*
    Receiving rank:
    Higher receiving yards per game is better.
    */

    const receivingRankings =
      this.createCategoryRankings(
        formulaTeams,
        team =>
          team.receiving
            ?.receivingYardsPerGame,
        true
      );

    /*
    Defense rank:
    Lower points allowed per game is better.
    */

    const defenseRankings =
      this.createCategoryRankings(
        formulaTeams,
        team =>
          team.defense
            ?.pointsAllowedPerGame,
        false
      );

    /*
    Average points per game rank:
    Higher points scored per game is better.
    */

    const pointsPerGameRankings =
      this.createCategoryRankings(
        formulaTeams,
        team =>
          team.scoring
            ?.pointsPerGame,
        true
      );

    return formulaTeams.map(
      team => {
        const teamId =
          String(team.teamId);

        const passing =
          passingRankings.get(
            teamId
          ) || {
            rank: 32,
            value: 0
          };

        const rushing =
          rushingRankings.get(
            teamId
          ) || {
            rank: 32,
            value: 0
          };

        const receiving =
          receivingRankings.get(
            teamId
          ) || {
            rank: 32,
            value: 0
          };

        const defense =
          defenseRankings.get(
            teamId
          ) || {
            rank: 32,
            value: 0
          };

        const pointsPerGame =
          pointsPerGameRankings.get(
            teamId
          ) || {
            rank: 32,
            value: 0
          };

        return {
          ...team,

          rankings: {
            passing:
              passing.rank,

            rushing:
              rushing.rank,

            receiving:
              receiving.rank,

            defense:
              defense.rank,

            pointsPerGame:
              pointsPerGame.rank
          },

          rankingValues: {
            passing:
              this.round(
                passing.value,
                1
              ),

            rushing:
              this.round(
                rushing.value,
                1
              ),

            receiving:
              this.round(
                receiving.value,
                1
              ),

            defense:
              this.round(
                defense.value,
                1
              ),

            pointsPerGame:
              this.round(
                pointsPerGame.value,
                1
              )
          }
        };
      }
    );
  },

  /*
  =======================================================
  CONNECT RANKED TEAM TO GAME TEAM
  =======================================================
  */

  connectGameTeam(
    gameTeam = {},
    rankedTeam = {},
    isHome = false
  ) {
    return {
      ...rankedTeam,

      teamId:
        String(
          gameTeam.teamId ||
          rankedTeam.teamId ||
          ""
        ),

      teamName:
        gameTeam.teamName ||
        rankedTeam.teamName ||
        "NFL Team",

      abbreviation:
        gameTeam.abbreviation ||
        rankedTeam.abbreviation ||
        "NFL",

      logo:
        gameTeam.logo ||
        rankedTeam.logo ||
        "",

      isHome:
        Boolean(isHome)
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
      Array.isArray(
        scheduleData.games
      )
        ? scheduleData.games
        : [];

    const storedTeams =
      Array.isArray(
        teamStatsData.teams
      )
        ? teamStatsData.teams
        : [];

    if (!storedTeams.length) {
      throw new Error(
        "No NFL team statistics were found."
      );
    }

    /*
    Rankings are calculated using every team in
    team-stats.json, not only teams playing today.
    */

    const rankedTeams =
      this.buildRankedTeams(
        storedTeams
      );

    const rankedTeamsById =
      new Map(
        rankedTeams.map(
          team => [
            String(team.teamId),
            team
          ]
        )
      );

    console.log(
      `POPS NFL ranked ${rankedTeams.length} teams.`
    );

    /*
    Optional ranking table for testing in the
    browser console.
    */

    console.table(
      rankedTeams
        .map(team => ({
          team:
            team.abbreviation,

          passing:
            team.rankings
              ?.passing,

          rushing:
            team.rankings
              ?.rushing,

          receiving:
            team.rankings
              ?.receiving,

          defense:
            team.rankings
              ?.defense,

          pointsPerGame:
            team.rankings
              ?.pointsPerGame
        }))
        .sort(
          (first, second) =>
            first.passing -
            second.passing
        )
    );

    const matchups =
      games
        .map(game => {
          const awayRanked =
            rankedTeamsById.get(
              String(
                game.away?.teamId
              )
            );

          const homeRanked =
            rankedTeamsById.get(
              String(
                game.home?.teamId
              )
            );

          if (
            !awayRanked ||
            !homeRanked
          ) {
            console.warn(
              "POPS NFL missing ranked team stats:",
              game.name,
              {
                awayTeamId:
                  game.away?.teamId,

                homeTeamId:
                  game.home?.teamId
              }
            );

            return null;
          }

          return {
            gameId:
              game.gameId,

            name:
              game.name,

            shortName:
              game.shortName,

            week:
              game.week ||
              scheduleData.week,

            season:
              game.season ||
              scheduleData.season,

            startTime:
              game.startTime ||
              new Date(
                game.date
              ).getTime(),

            date:
              game.date,

            state:
              game.state,

            completed:
              game.completed,

            statusText:
              game.status,

            away:
              game.away,

            home:
              game.home,

            awayTeamData:
              this.connectGameTeam(
                game.away,
                awayRanked,
                false
              ),

            homeTeamData:
              this.connectGameTeam(
                game.home,
                homeRanked,
                true
              )
          };
        })
        .filter(Boolean);

    console.log(
      `POPS NFL loaded ${matchups.length} ranked moneyline matchups.`
    );

    if (!matchups.length) {
      throw new Error(
        "No official NFL matchups could be connected to the team rankings."
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
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Time TBD";
    }

    return date.toLocaleString(
      [],
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    );
  }
};

window.NFLMoneylineData =
  NFLMoneylineData;