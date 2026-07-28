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