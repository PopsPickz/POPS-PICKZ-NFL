/*
=========================================================
POPS PICKZ NFL — MONEYLINE TEST DATA
File: moneyline-data.js
=========================================================

This file temporarily uses local matchup data so we can
prove the formula and card design work before reconnecting
automatic NFL data.
=========================================================
*/

const NFLMoneylineData = {
  matchups: [
    {
      gameId: "kc-buf-test",

      name:
        "Kansas City Chiefs vs Buffalo Bills",

      startTime:
        new Date(
          "2026-09-13T20:20:00"
        ).getTime(),

      state: "pre",
      completed: false,
      week: 1,

      away: {
        teamId: "buf",
        teamName: "Buffalo Bills",
        abbreviation: "BUF",
        logo: "",
        isHome: false
      },

      home: {
        teamId: "kc",
        teamName: "Kansas City Chiefs",
        abbreviation: "KC",
        logo: "",
        isHome: true
      },

      awayTeamData: {
        teamId: "buf",
        teamName: "Buffalo Bills",
        abbreviation: "BUF",
        logo: "",
        isHome: false,

        passing: {
          passingYardsPerGame: 258,
          completionPercentage: 66.4,
          passingTouchdownsPerGame: 2.1,
          interceptionsPerGame: 0.7,
          passerRating: 99,
          passingYardsPerAttempt: 7.4
        },

        rushing: {
          rushingYardsPerGame: 138,
          rushingYardsPerAttempt: 4.7,
          rushingTouchdownsPerGame: 1.2,
          rushingFirstDownsPerGame: 7.1,
          explosiveRushPercentage: 12
        },

        receiving: {
          receivingYardsPerGame: 258,
          receptionsPerGame: 23,
          catchPercentage: 66,
          receivingTouchdownsPerGame: 2.1,
          yardsAfterCatchPerGame: 116,
          yardsPerReception: 11.2
        },

        defense: {
          pointsAllowedPerGame: 21.4,
          totalYardsAllowedPerGame: 326,
          passingYardsAllowedPerGame: 214,
          rushingYardsAllowedPerGame: 112,
          sacksPerGame: 2.7,
          takeawaysPerGame: 1.4,
          thirdDownPercentageAllowed: 38
        },

        specialTeams: {
          fieldGoalPercentage: 87,
          extraPointPercentage: 97,
          netPuntAverage: 42,
          kickReturnAverage: 24,
          puntReturnAverage: 9,
          specialTeamsTouchdowns: 1
        },

        offensiveLine: {
          sacksAllowedPerGame: 2.1,
          pressurePercentageAllowed: 29,
          quarterbackHitsAllowedPerGame: 5,
          rushingYardsBeforeContact: 1.7,
          passBlockWinRate: 66,
          runBlockWinRate: 71
        }
      },

      homeTeamData: {
        teamId: "kc",
        teamName: "Kansas City Chiefs",
        abbreviation: "KC",
        logo: "",
        isHome: true,

        passing: {
          passingYardsPerGame: 276,
          completionPercentage: 68.2,
          passingTouchdownsPerGame: 2.3,
          interceptionsPerGame: 0.6,
          passerRating: 104,
          passingYardsPerAttempt: 7.8
        },

        rushing: {
          rushingYardsPerGame: 118,
          rushingYardsPerAttempt: 4.2,
          rushingTouchdownsPerGame: 0.9,
          rushingFirstDownsPerGame: 6,
          explosiveRushPercentage: 9
        },

        receiving: {
          receivingYardsPerGame: 276,
          receptionsPerGame: 25,
          catchPercentage: 68,
          receivingTouchdownsPerGame: 2.3,
          yardsAfterCatchPerGame: 125,
          yardsPerReception: 11
        },

        defense: {
          pointsAllowedPerGame: 18.8,
          totalYardsAllowedPerGame: 304,
          passingYardsAllowedPerGame: 198,
          rushingYardsAllowedPerGame: 106,
          sacksPerGame: 3.1,
          takeawaysPerGame: 1.5,
          thirdDownPercentageAllowed: 34
        },

        specialTeams: {
          fieldGoalPercentage: 91,
          extraPointPercentage: 99,
          netPuntAverage: 44,
          kickReturnAverage: 23,
          puntReturnAverage: 11,
          specialTeamsTouchdowns: 1
        },

        offensiveLine: {
          sacksAllowedPerGame: 1.7,
          pressurePercentageAllowed: 25,
          quarterbackHitsAllowedPerGame: 4.2,
          rushingYardsBeforeContact: 1.6,
          passBlockWinRate: 71,
          runBlockWinRate: 69
        }
      }
    }
  ],

  async loadMoneylineMatchups() {
    return this.matchups;
  },

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
