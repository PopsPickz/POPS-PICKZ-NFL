/*
=========================================================
POPS PICKZ NFL — TOUCHDOWN SCORER FORMULA
File: td-formula.js
Version: 2.0
=========================================================

POPS TD SCORE — 100 POINTS

1. Team scoring environment      16
2. Red-zone usage                20
3. Goal-line usage               20
4. Touches and targets           12
5. Opponent matchup              10
6. Snap share                     6
7. Recent touchdown form          6
8. Touchdown scoring rate         7
9. Home-field bonus               1
10. Position scoring profile      2
=========================================================
*/

const NFLTouchdownFormula = {
  weights: {
    teamScoring: 16,
    redZoneUsage: 20,
    goalLineUsage: 20,
    opportunity: 12,
    opponentMatchup: 10,
    snapShare: 6,
    recentForm: 6,
    touchdownRate: 7,
    homeField: 1,
    positionProfile: 2
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

  hasNumber(value) {
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
    );
  },

  firstNumber(values = [], fallback = 0) {
    for (const value of values) {
      if (this.hasNumber(value)) {
        return Number(value);
      }
    }

    return fallback;
  },

  clamp(value, minimum = 0, maximum = 100) {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        this.number(value)
      )
    );
  },

  round(value, decimals = 0) {
    const multiplier =
      10 ** decimals;

    return (
      Math.round(
        this.number(value) *
        multiplier
      ) / multiplier
    );
  },

  normalize(
    value,
    lowValue,
    highValue,
    higherIsBetter = true
  ) {
    const numericValue =
      this.number(value);

    const low =
      this.number(lowValue);

    const high =
      this.number(highValue);

    if (low === high) {
      return 50;
    }

    let score;

    if (higherIsBetter) {
      score =
        (
          (numericValue - low) /
          (high - low)
        ) * 100;
    } else {
      score =
        (
          (low - numericValue) /
          (low - high)
        ) * 100;
    }

    return this.clamp(score);
  },

  percentage(value, fallback = 0) {
    let percentage =
      this.number(value, fallback);

    if (
      percentage > 0 &&
      percentage <= 1
    ) {
      percentage *= 100;
    }

    return this.clamp(
      percentage,
      0,
      100
    );
  },

  gamesPlayed(player = {}) {
    return Math.max(
      1,
      this.firstNumber(
        [
          player.gamesPlayed,
          player.games,
          player.teamGamesPlayed
        ],
        1
      )
    );
  },

  perGame(
    perGameValue,
    totalValue,
    gamesPlayed,
    fallback = 0
  ) {
    if (this.hasNumber(perGameValue)) {
      return Math.max(
        0,
        Number(perGameValue)
      );
    }

    if (this.hasNumber(totalValue)) {
      return Math.max(
        0,
        Number(totalValue) /
        Math.max(1, gamesPlayed)
      );
    }

    return fallback;
  },

  position(player = {}) {
    return String(
      player.position || ""
    )
      .trim()
      .toUpperCase();
  },

  /*
  =======================================================
  TEAM SCORING ENVIRONMENT — 16 POINTS
  =======================================================
  */

  calculateTeamScoring(player = {}) {
    const projectedPoints =
      this.firstNumber(
        [
          player.projectedTeamPoints,
          player.teamTotal,
          player.impliedTeamTotal,
          player.teamPointsPerGame,
          player.pointsPerGame
        ],
        21
      );

    const normalized =
      this.normalize(
        projectedPoints,
        14,
        34,
        true
      );

    return this.round(
      normalized *
      (
        this.weights.teamScoring /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  RED-ZONE USAGE — 20 POINTS
  =======================================================
  */

  calculateRedZoneUsage(player = {}) {
    const gamesPlayed =
      this.gamesPlayed(player);

    const redZoneCarries =
      this.perGame(
        player.redZoneCarriesPerGame,
        player.redZoneCarries,
        gamesPlayed,
        0
      );

    const redZoneTargets =
      this.perGame(
        player.redZoneTargetsPerGame,
        player.redZoneTargets,
        gamesPlayed,
        0
      );

    const calculatedTouches =
      redZoneCarries +
      redZoneTargets;

    const redZoneTouches =
      this.perGame(
        player.redZoneTouchesPerGame,
        player.redZoneTouches,
        gamesPlayed,
        calculatedTouches
      );

    const redZoneShare =
      this.percentage(
        this.firstNumber(
          [
            player.redZoneOpportunityShare,
            player.redZoneShare,
            player.teamRedZoneShare
          ],
          15
        )
      );

    const touchesScore =
      this.normalize(
        redZoneTouches,
        0,
        5.5,
        true
      );

    const shareScore =
      this.normalize(
        redZoneShare,
        5,
        45,
        true
      );

    const combined =
      touchesScore * 0.72 +
      shareScore * 0.28;

    return this.round(
      combined *
      (
        this.weights.redZoneUsage /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  GOAL-LINE USAGE — 20 POINTS

  Uses opportunities inside the opponent's five-yard line.
  QB sneaks are not double-counted when already included
  in the quarterback's goal-line carries.
  =======================================================
  */

  calculateGoalLineUsage(player = {}) {
    const position =
      this.position(player);

    const gamesPlayed =
      this.gamesPlayed(player);

    const goalLineCarries =
      this.perGame(
        this.firstNumber(
          [
            player.goalLineCarriesPerGame,
            player.insideFiveCarriesPerGame
          ],
          null
        ),
        this.firstNumber(
          [
            player.goalLineCarries,
            player.insideFiveCarries
          ],
          null
        ),
        gamesPlayed,
        0
      );

    const endZoneTargets =
      this.perGame(
        player.endZoneTargetsPerGame,
        player.endZoneTargets,
        gamesPlayed,
        0
      );

    const qbSneaks =
      this.perGame(
        player.qbSneaksPerGame,
        player.qbSneaks,
        gamesPlayed,
        0
      );

    let rushingOpportunities =
      goalLineCarries;

    if (position === "QB") {
      rushingOpportunities =
        Math.max(
          goalLineCarries,
          qbSneaks
        );
    }

    const totalOpportunities =
      rushingOpportunities +
      endZoneTargets;

    const normalized =
      this.normalize(
        totalOpportunities,
        0,
        2.5,
        true
      );

    return this.round(
      normalized *
      (
        this.weights.goalLineUsage /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  TOUCHES AND TARGETS — 12 POINTS
  =======================================================
  */

  calculateOpportunity(player = {}) {
    const position =
      this.position(player);

    const gamesPlayed =
      this.gamesPlayed(player);

    const carries =
      this.perGame(
        this.firstNumber(
          [
            player.carriesPerGame,
            player.rushingAttemptsPerGame
          ],
          null
        ),
        this.firstNumber(
          [
            player.carries,
            player.rushingAttempts
          ],
          null
        ),
        gamesPlayed,
        0
      );

    const targets =
      this.perGame(
        player.targetsPerGame,
        player.targets,
        gamesPlayed,
        0
      );

    const receptions =
      this.perGame(
        player.receptionsPerGame,
        player.receptions,
        gamesPlayed,
        0
      );

    const designedRuns =
      this.perGame(
        this.firstNumber(
          [
            player.designedRunsPerGame,
            player.qbDesignedRunsPerGame
          ],
          null
        ),
        this.firstNumber(
          [
            player.designedRuns,
            player.qbDesignedRuns
          ],
          null
        ),
        gamesPlayed,
        0
      );

    let normalized = 0;

    if (position === "RB") {
      normalized =
        this.normalize(
          carries +
          targets * 0.80,
          4,
          24,
          true
        );
    } else if (
      position === "WR" ||
      position === "TE"
    ) {
      normalized =
        this.normalize(
          targets +
          receptions * 0.25,
          2,
          13,
          true
        );
    } else if (position === "QB") {
      normalized =
        this.normalize(
          designedRuns,
          0,
          7,
          true
        );
    } else {
      normalized =
        this.normalize(
          carries +
          targets,
          1,
          18,
          true
        );
    }

    return this.round(
      normalized *
      (
        this.weights.opportunity /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  OPPONENT MATCHUP — 10 POINTS
  =======================================================
  */

  calculateOpponentMatchup(player = {}) {
    const position =
      this.position(player);

    let touchdownsAllowed =
      this.firstNumber(
        [
          player.opponentTouchdownsAllowedPerGame,
          player.opponentTotalTouchdownsAllowedPerGame
        ],
        1
      );

    if (position === "RB") {
      touchdownsAllowed =
        this.firstNumber(
          [
            player.opponentRBTDsAllowedPerGame,
            player.opponentRushingTDsAllowedPerGame
          ],
          touchdownsAllowed
        );
    }

    if (position === "WR") {
      touchdownsAllowed =
        this.firstNumber(
          [
            player.opponentWRTDsAllowedPerGame,
            player.opponentReceiverTDsAllowedPerGame
          ],
          touchdownsAllowed
        );
    }

    if (position === "TE") {
      touchdownsAllowed =
        this.firstNumber(
          [
            player.opponentTETDsAllowedPerGame
          ],
          touchdownsAllowed
        );
    }

    if (position === "QB") {
      touchdownsAllowed =
        this.firstNumber(
          [
            player.opponentQBRushingTDsAllowedPerGame,
            player.opponentRushingTDsAllowedPerGame
          ],
          touchdownsAllowed
        );
    }

    const normalized =
      this.normalize(
        touchdownsAllowed,
        0.25,
        1.8,
        true
      );

    return this.round(
      normalized *
      (
        this.weights.opponentMatchup /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  SNAP SHARE — 6 POINTS
  =======================================================
  */

  calculateSnapShare(player = {}) {
    const snapShare =
      this.percentage(
        this.firstNumber(
          [
            player.snapShare,
            player.snapPercentage,
            player.offensiveSnapPercentage
          ],
          60
        )
      );

    const normalized =
      this.normalize(
        snapShare,
        30,
        95,
        true
      );

    return this.round(
      normalized *
      (
        this.weights.snapShare /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  RECENT TOUCHDOWN FORM — 6 POINTS
  =======================================================
  */

  calculateRecentForm(player = {}) {
    const recentTouchdowns =
      this.firstNumber(
        [
          player.touchdownsLast5,
          player.recentTouchdowns,
          player.lastFiveTouchdowns
        ],
        0
      );

    const recentRedZoneTouches =
      this.firstNumber(
        [
          player.redZoneTouchesLast5,
          player.recentRedZoneTouches
        ],
        0
      );

    const touchdownScore =
      this.normalize(
        recentTouchdowns,
        0,
        5,
        true
      );

    const usageScore =
      this.normalize(
        recentRedZoneTouches,
        0,
        18,
        true
      );

    const combined =
      touchdownScore * 0.70 +
      usageScore * 0.30;

    return this.round(
      combined *
      (
        this.weights.recentForm /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  TOUCHDOWN SCORING RATE — 7 POINTS
  =======================================================
  */

  calculateTouchdownRate(player = {}) {
    const gamesPlayed =
      this.gamesPlayed(player);

    const touchdownsPerGame =
      this.firstNumber(
        [
          player.touchdownsPerGame,
          player.totalTouchdownsPerGame,
          player.scoringTouchdownsPerGame
        ],
        null
      );

    const totalTouchdowns =
      this.firstNumber(
        [
          player.totalTouchdowns,
          player.touchdowns,
          player.scoringTouchdowns
        ],
        null
      );

    let rate;

    if (this.hasNumber(touchdownsPerGame)) {
      rate =
        Number(touchdownsPerGame);
    } else if (this.hasNumber(totalTouchdowns)) {
      rate =
        Number(totalTouchdowns) /
        gamesPlayed;
    } else {
      rate = 0.30;
    }

    const normalized =
      this.normalize(
        rate,
        0.05,
        1,
        true
      );

    return this.round(
      normalized *
      (
        this.weights.touchdownRate /
        100
      ),
      1
    );
  },

  /*
  =======================================================
  HOME-FIELD BONUS — 1 POINT
  =======================================================
  */

  calculateHomeField(player = {}) {
    const isHome =
      player.isHome === true ||
      String(
        player.homeAway || ""
      ).toLowerCase() === "home";

    return isHome
      ? this.weights.homeField
      : 0;
  },

  /*
  =======================================================
  POSITION PROFILE — 2 POINTS
  =======================================================
  */

  calculatePositionProfile(player = {}) {
    const position =
      this.position(player);

    const bonuses = {
      RB: 2,
      TE: 1.6,
      WR: 1.5,
      QB: 1.2
    };

    return this.number(
      bonuses[position],
      0.8
    );
  },

  /*
  =======================================================
  ESTIMATED TOUCHDOWN PROBABILITY

  This is a POPS model estimate and not sportsbook odds.
  =======================================================
  */

  calculateProbability(score) {
    const normalizedScore =
      this.clamp(score);

    const probability =
      6 +
      normalizedScore * 0.56;

    return this.round(
      this.clamp(
        probability,
        6,
        62
      )
    );
  },

  /*
  =======================================================
  SCORE TIER
  =======================================================
  */

  getTier(score) {
    if (score >= 88) {
      return {
        label: "Elite TD Pick",
        icon: "⭐",
        className: "elite"
      };
    }

    if (score >= 80) {
      return {
        label: "Excellent TD Pick",
        icon: "🔥",
        className: "excellent"
      };
    }

    if (score >= 72) {
      return {
        label: "Strong TD Pick",
        icon: "✅",
        className: "strong"
      };
    }

    if (score >= 64) {
      return {
        label: "Good TD Value",
        icon: "👍",
        className: "good"
      };
    }

    if (score >= 55) {
      return {
        label: "TD Sleeper",
        icon: "⚠️",
        className: "sleeper"
      };
    }

    return {
      label: "Pass",
      icon: "❌",
      className: "pass"
    };
  },

  /*
  =======================================================
  DATA QUALITY
  =======================================================
  */

  calculateDataQuality(player = {}) {
    const fields = [
      player.projectedTeamPoints,
      player.teamPointsPerGame,

      player.redZoneTouchesPerGame,
      player.redZoneTouches,
      player.redZoneOpportunityShare,
      player.redZoneShare,

      player.goalLineCarriesPerGame,
      player.goalLineCarries,
      player.insideFiveCarriesPerGame,
      player.insideFiveCarries,
      player.endZoneTargetsPerGame,
      player.endZoneTargets,

      player.carriesPerGame,
      player.rushingAttemptsPerGame,
      player.targetsPerGame,

      player.snapShare,
      player.snapPercentage,
      player.offensiveSnapPercentage,

      player.touchdownsLast5,
      player.totalTouchdowns,
      player.touchdownsPerGame
    ];

    const available =
      fields.filter(value =>
        this.hasNumber(value)
      ).length;

    const percentage =
      (
        available /
        fields.length
      ) * 100;

    if (percentage >= 60) {
      return {
        label: "High",
        className: "high",
        percentage:
          this.round(percentage)
      };
    }

    if (percentage >= 35) {
      return {
        label: "Medium",
        className: "medium",
        percentage:
          this.round(percentage)
      };
    }

    return {
      label: "Low",
      className: "low",
      percentage:
        this.round(percentage)
    };
  },

  /*
  =======================================================
  EVALUATE PLAYER
  =======================================================
  */

  evaluatePlayer(player = {}) {
    const breakdown = {
      teamScoring:
        this.calculateTeamScoring(
          player
        ),

      redZoneUsage:
        this.calculateRedZoneUsage(
          player
        ),

      goalLineUsage:
        this.calculateGoalLineUsage(
          player
        ),

      opportunity:
        this.calculateOpportunity(
          player
        ),

      opponentMatchup:
        this.calculateOpponentMatchup(
          player
        ),

      snapShare:
        this.calculateSnapShare(
          player
        ),

      recentForm:
        this.calculateRecentForm(
          player
        ),

      touchdownRate:
        this.calculateTouchdownRate(
          player
        ),

      homeField:
        this.calculateHomeField(
          player
        ),

      positionProfile:
        this.calculatePositionProfile(
          player
        )
    };

    const rawScore =
      Object.values(
        breakdown
      ).reduce(
        (sum, value) =>
          sum +
          this.number(value),
        0
      );

    const score =
      this.round(
        this.clamp(rawScore)
      );

    const tier =
      this.getTier(score);

    const probability =
      this.calculateProbability(
        score
      );

    const dataQuality =
      this.calculateDataQuality(
        player
      );

    return {
      ...player,

      score,

      probability,

      tier,

      dataQuality,

      breakdown
    };
  },

  /*
  =======================================================
  RANK PLAYERS
  =======================================================
  */

  rankPlayers(players = []) {
    if (!Array.isArray(players)) {
      return [];
    }

    return players
      .filter(player =>
        player &&
        typeof player === "object"
      )
      .map(player =>
        this.evaluatePlayer(player)
      )
      .sort(
        (first, second) =>
          second.score -
          first.score ||
          second.probability -
          first.probability ||
          String(first.name || "")
            .localeCompare(
              String(second.name || "")
            )
      );
  }
};

window.NFLTouchdownFormula =
  NFLTouchdownFormula;