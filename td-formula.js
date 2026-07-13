/*
=========================================================
POPS PICKZ NFL — TOUCHDOWN SCORER FORMULA
File: td-formula.js
Version: 1.0
=========================================================

POPS TD SCORE — 100 POINTS

1. Team scoring environment      18
2. Red-zone usage               20
3. Goal-line usage              18
4. Touches and targets          14
5. Opponent matchup             12
6. Snap share                    6
7. Recent touchdown form         7
8. Home-field bonus              2
9. Position scoring profile      3
=========================================================
*/

const NFLTouchdownFormula = {
  weights: {
    teamScoring: 18,
    redZoneUsage: 20,
    goalLineUsage: 18,
    opportunity: 14,
    opponentMatchup: 12,
    snapShare: 6,
    recentForm: 7,
    homeField: 2,
    positionProfile: 3
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

  clamp(
    value,
    minimum = 0,
    maximum = 100
  ) {
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

  position(player = {}) {
    return String(
      player.position || ""
    ).toUpperCase();
  },

  /*
  =======================================================
  TEAM SCORING ENVIRONMENT — 18 POINTS

  Uses projected team points when available.
  Falls back to season points per game.
  =======================================================
  */

  calculateTeamScoring(player = {}) {
    const projectedPoints =
      this.number(
        player.projectedTeamPoints ||
        player.teamTotal ||
        player.impliedTeamTotal ||
        player.teamPointsPerGame,
        21
      );

    const normalized =
      this.normalize(
        projectedPoints,
        14,
        35,
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
    const redZoneCarries =
      this.number(
        player.redZoneCarriesPerGame ||
        player.redZoneCarries
      );

    const redZoneTargets =
      this.number(
        player.redZoneTargetsPerGame ||
        player.redZoneTargets
      );

    const redZoneTouches =
      this.number(
        player.redZoneTouchesPerGame ||
        player.redZoneTouches,
        redZoneCarries +
        redZoneTargets
      );

    const redZoneShare =
      this.number(
        player.redZoneOpportunityShare ||
        player.redZoneShare
      );

    const touchesScore =
      this.normalize(
        redZoneTouches,
        0,
        6,
        true
      );

    const shareScore =
      this.normalize(
        redZoneShare,
        0,
        45,
        true
      );

    const combined =
      touchesScore * 0.70 +
      shareScore * 0.30;

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
  GOAL-LINE USAGE — 18 POINTS

  Inside the opponent's 5-yard line.
  =======================================================
  */

  calculateGoalLineUsage(player = {}) {
    const goalLineCarries =
      this.number(
        player.goalLineCarriesPerGame ||
        player.goalLineCarries ||
        player.insideFiveCarriesPerGame ||
        player.insideFiveCarries
      );

    const endZoneTargets =
      this.number(
        player.endZoneTargetsPerGame ||
        player.endZoneTargets
      );

    const qbSneaks =
      this.number(
        player.qbSneaksPerGame ||
        player.qbSneaks
      );

    const totalOpportunities =
      goalLineCarries +
      endZoneTargets +
      qbSneaks;

    const normalized =
      this.normalize(
        totalOpportunities,
        0,
        3,
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
  TOUCHES AND TARGETS — 14 POINTS
  =======================================================
  */

  calculateOpportunity(player = {}) {
    const position =
      this.position(player);

    const carries =
      this.number(
        player.carriesPerGame ||
        player.rushingAttemptsPerGame
      );

    const targets =
      this.number(
        player.targetsPerGame
      );

    const receptions =
      this.number(
        player.receptionsPerGame
      );

    const designedRuns =
      this.number(
        player.designedRunsPerGame ||
        player.qbDesignedRunsPerGame
      );

    let normalized = 0;

    if (position === "RB") {
      normalized =
        this.normalize(
          carries + targets,
          5,
          25,
          true
        );
    } else if (
      position === "WR" ||
      position === "TE"
    ) {
      normalized =
        this.normalize(
          targets + receptions * 0.35,
          2,
          14,
          true
        );
    } else if (position === "QB") {
      normalized =
        this.normalize(
          designedRuns,
          0,
          8,
          true
        );
    } else {
      normalized =
        this.normalize(
          carries + targets,
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
  OPPONENT MATCHUP — 12 POINTS

  Higher defensive TD allowance is better for the player.
  =======================================================
  */

  calculateOpponentMatchup(player = {}) {
    const position =
      this.position(player);

    let touchdownsAllowed =
      this.number(
        player.opponentTouchdownsAllowedPerGame ||
        player.opponentTotalTouchdownsAllowedPerGame
      );

    if (position === "RB") {
      touchdownsAllowed =
        this.number(
          player.opponentRBTDsAllowedPerGame,
          touchdownsAllowed
        );
    }

    if (position === "WR") {
      touchdownsAllowed =
        this.number(
          player.opponentWRTDsAllowedPerGame,
          touchdownsAllowed
        );
    }

    if (position === "TE") {
      touchdownsAllowed =
        this.number(
          player.opponentTETDsAllowedPerGame,
          touchdownsAllowed
        );
    }

    if (position === "QB") {
      touchdownsAllowed =
        this.number(
          player.opponentQBRushingTDsAllowedPerGame,
          touchdownsAllowed
        );
    }

    const normalized =
      this.normalize(
        touchdownsAllowed,
        0.3,
        2.2,
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
      this.number(
        player.snapShare ||
        player.snapPercentage ||
        player.offensiveSnapPercentage
      );

    const normalized =
      this.normalize(
        snapShare,
        25,
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
  RECENT TOUCHDOWN FORM — 7 POINTS
  =======================================================
  */

  calculateRecentForm(player = {}) {
    const recentTouchdowns =
      this.number(
        player.touchdownsLast5 ||
        player.recentTouchdowns ||
        player.lastFiveTouchdowns
      );

    const recentRedZoneTouches =
      this.number(
        player.redZoneTouchesLast5
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
        20,
        true
      );

    const combined =
      touchdownScore * 0.75 +
      usageScore * 0.25;

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
  HOME-FIELD BONUS — 2 POINTS
  =======================================================
  */

  calculateHomeField(player = {}) {
    return player.isHome === true
      ? this.weights.homeField
      : 0;
  },

  /*
  =======================================================
  POSITION PROFILE — 3 POINTS
  =======================================================
  */

  calculatePositionProfile(player = {}) {
    const position =
      this.position(player);

    const bonuses = {
      RB: 3,
      TE: 2.4,
      WR: 2.2,
      QB: 1.8
    };

    return this.number(
      bonuses[position],
      1
    );
  },

  /*
  =======================================================
  ESTIMATED TOUCHDOWN PROBABILITY
  =======================================================
  */

  calculateProbability(score) {
    const normalizedScore =
      this.clamp(score);

    /*
    Converts the POPS score into a readable estimated
    touchdown probability.

    This is a model estimate, not sportsbook odds.
    */

    const probability =
      8 +
      normalizedScore * 0.68;

    return this.round(
      this.clamp(
        probability,
        8,
        76
      )
    );
  },

  /*
  =======================================================
  SCORE TIER
  =======================================================
  */

  getTier(score) {
    if (score >= 90) {
      return {
        label: "Elite TD Pick",
        icon: "⭐",
        className: "elite"
      };
    }

    if (score >= 82) {
      return {
        label: "Excellent TD Pick",
        icon: "🔥",
        className: "excellent"
      };
    }

    if (score >= 74) {
      return {
        label: "Strong TD Pick",
        icon: "✅",
        className: "strong"
      };
    }

    if (score >= 66) {
      return {
        label: "Good TD Value",
        icon: "👍",
        className: "good"
      };
    }

    if (score >= 58) {
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

      homeField:
        this.calculateHomeField(
          player
        ),

      positionProfile:
        this.calculatePositionProfile(
          player
        )
    };

    const score =
      this.round(
        Object.values(
          breakdown
        ).reduce(
          (sum, value) =>
            sum +
            this.number(value),
          0
        )
      );

    const tier =
      this.getTier(score);

    const probability =
      this.calculateProbability(
        score
      );

    return {
      ...player,

      score:
        this.clamp(score),

      probability,

      tier,

      breakdown
    };
  },

  /*
  =======================================================
  RANK PLAYERS
  =======================================================
  */

  rankPlayers(players = []) {
    return players
      .map(player =>
        this.evaluatePlayer(player)
      )
      .sort(
        (first, second) =>
          second.score -
          first.score ||
          second.probability -
          first.probability
      );
  }
};

window.NFLTouchdownFormula =
  NFLTouchdownFormula;
