/*
=========================================================
POPS PICKZ NFL — MONEYLINE FORMULA
File: moneyline-formula.js
Version: 1.0
=========================================================

CATEGORIES

1. Passing
2. Rushing
3. Receiving
4. Defense
5. Special Teams
6. Offensive Line

PURPOSE

- Scores every team from 0–100
- Compares both teams in six categories
- Calculates an overall rating
- Selects the POPS moneyline pick
- Calculates confidence
- Supplies category advantages to moneyline.js

OTHER FILES

moneyline-data.js
moneyline.js
moneyline-style.css
=========================================================
*/

const NFLMoneylineFormula = {
  /*
  =======================================================
  CATEGORY WEIGHTS

  Total = 100%
  =======================================================
  */

  weights: {
   passing: 0.20,
   rushing: 0.15,
   receiving: 0.15,
   defense: 0.20,
   pointsPerGame: 0.15,
   pointsAllowedPerGame: 0.15
 },

  categoryKeys: [
   "passing",
   "rushing",
   "receiving",
   "defense",
   "pointsPerGame",
   "pointsAllowedPerGame"
 ],

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

  clamp(value, minimum = 0, maximum = 100) {
    const numericValue = this.number(value);

    return Math.min(
      maximum,
      Math.max(minimum, numericValue)
    );
  },

  round(value, decimals = 0) {
    const multiplier = 10 ** decimals;

    return (
      Math.round(
        this.number(value) * multiplier
      ) / multiplier
    );
  },

  average(values = [], fallback = 50) {
    const validValues = values
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));

    if (!validValues.length) {
      return fallback;
    }

    const total = validValues.reduce(
      (sum, value) => sum + value,
      0
    );

    return total / validValues.length;
  },

  /*
  =======================================================
  NORMALIZE RAW STAT TO 0–100

  higherIsBetter:
  true  = higher number is better
  false = lower number is better
  =======================================================
  */

  normalize(
    value,
    badValue,
    eliteValue,
    higherIsBetter = true
  ) {
    const numericValue = this.number(value);
    const bad = this.number(badValue);
    const elite = this.number(eliteValue);

    if (bad === elite) {
      return 50;
    }

    let score;

    if (higherIsBetter) {
      score =
        ((numericValue - bad) /
          (elite - bad)) *
        100;
    } else {
      score =
        ((bad - numericValue) /
          (bad - elite)) *
        100;
    }

    return this.clamp(score);
  },

  /*
  =======================================================
  PASSING SCORE

  Factors:
  - Passing yards per game
  - Completion percentage
  - Passing touchdowns per game
  - Interceptions per game
  - Passer rating
  - Yards per pass attempt
  =======================================================
  */

  calculatePassingScore(stats = {}) {
    const yardsScore = this.normalize(
      stats.passingYardsPerGame,
      160,
      310,
      true
    );

    const completionScore = this.normalize(
      stats.completionPercentage,
      55,
      73,
      true
    );

    const touchdownScore = this.normalize(
      stats.passingTouchdownsPerGame,
      0.6,
      2.8,
      true
    );

    const interceptionScore = this.normalize(
      stats.interceptionsPerGame,
      1.6,
      0.2,
      false
    );

    const ratingScore = this.normalize(
      stats.passerRating,
      70,
      115,
      true
    );

    const yardsPerAttemptScore = this.normalize(
      stats.passingYardsPerAttempt,
      5.5,
      9,
      true
    );

    const total =
      yardsScore * 0.24 +
      completionScore * 0.16 +
      touchdownScore * 0.20 +
      interceptionScore * 0.16 +
      ratingScore * 0.14 +
      yardsPerAttemptScore * 0.10;

    return this.round(
      this.clamp(total)
    );
  },

  /*
  =======================================================
  RUSHING SCORE

  Factors:
  - Rushing yards per game
  - Yards per rushing attempt
  - Rushing touchdowns per game
  - Rushing first downs per game
  - Explosive rushing percentage
  =======================================================
  */

  calculateRushingScore(stats = {}) {
    const yardsScore = this.normalize(
      stats.rushingYardsPerGame,
      70,
      180,
      true
    );

    const yardsPerCarryScore = this.normalize(
      stats.rushingYardsPerAttempt,
      3.2,
      5.6,
      true
    );

    const touchdownScore = this.normalize(
      stats.rushingTouchdownsPerGame,
      0.25,
      1.7,
      true
    );

    const firstDownScore = this.normalize(
      stats.rushingFirstDownsPerGame,
      3,
      10,
      true
    );

    const explosiveRushScore = this.normalize(
      stats.explosiveRushPercentage,
      5,
      17,
      true
    );

    const total =
      yardsScore * 0.31 +
      yardsPerCarryScore * 0.25 +
      touchdownScore * 0.20 +
      firstDownScore * 0.14 +
      explosiveRushScore * 0.10;

    return this.round(
      this.clamp(total)
    );
  },

  /*
  =======================================================
  RECEIVING SCORE

  Factors:
  - Receiving yards per game
  - Receptions per game
  - Catch percentage
  - Receiving touchdowns per game
  - Yards after catch per game
  - Yards per reception
  =======================================================
  */

  calculateReceivingScore(stats = {}) {
    const yardsScore = this.normalize(
      stats.receivingYardsPerGame,
      160,
      315,
      true
    );

    const receptionsScore = this.normalize(
      stats.receptionsPerGame,
      14,
      30,
      true
    );

    const catchScore = this.normalize(
      stats.catchPercentage,
      55,
      75,
      true
    );

    const touchdownScore = this.normalize(
      stats.receivingTouchdownsPerGame,
      0.6,
      2.8,
      true
    );

    const yardsAfterCatchScore = this.normalize(
      stats.yardsAfterCatchPerGame,
      65,
      155,
      true
    );

    const yardsPerReceptionScore = this.normalize(
      stats.yardsPerReception,
      8,
      14,
      true
    );

    const total =
      yardsScore * 0.25 +
      receptionsScore * 0.15 +
      catchScore * 0.14 +
      touchdownScore * 0.20 +
      yardsAfterCatchScore * 0.16 +
      yardsPerReceptionScore * 0.10;

    return this.round(
      this.clamp(total)
    );
  },

  /*
  =======================================================
  DEFENSE SCORE

  Lower allowed numbers are better.

  Factors:
  - Points allowed per game
  - Total yards allowed per game
  - Passing yards allowed per game
  - Rushing yards allowed per game
  - Sacks per game
  - Takeaways per game
  - Third-down percentage allowed
  =======================================================
  */

  calculateDefenseScore(stats = {}) {
    const pointsScore = this.normalize(
      stats.pointsAllowedPerGame,
      31,
      14,
      false
    );

    const totalYardsScore = this.normalize(
      stats.totalYardsAllowedPerGame,
      420,
      260,
      false
    );

    const passDefenseScore = this.normalize(
      stats.passingYardsAllowedPerGame,
      290,
      155,
      false
    );

    const rushDefenseScore = this.normalize(
      stats.rushingYardsAllowedPerGame,
      160,
      70,
      false
    );

    const sackScore = this.normalize(
      stats.sacksPerGame,
      0.8,
      4.5,
      true
    );

    const takeawayScore = this.normalize(
      stats.takeawaysPerGame,
      0.4,
      2.4,
      true
    );

    const thirdDownScore = this.normalize(
      stats.thirdDownPercentageAllowed,
      49,
      28,
      false
    );

    const total =
      pointsScore * 0.26 +
      totalYardsScore * 0.11 +
      passDefenseScore * 0.15 +
      rushDefenseScore * 0.15 +
      sackScore * 0.12 +
      takeawayScore * 0.12 +
      thirdDownScore * 0.09;

    return this.round(
      this.clamp(total)
    );
  },

  /*
=======================================================
AVERAGE POINTS SCORED PER GAME SCORE

Higher is better.
=======================================================
*/

calculatePointsPerGameScore(stats = {}) {
  const pointsPerGame =
    this.number(
      stats.pointsPerGame,
      22
    );

  return this.round(
    this.normalize(
      pointsPerGame,
      14,
      34,
      true
    )
  );
},

/*
=======================================================
AVERAGE POINTS ALLOWED PER GAME SCORE

Lower is better.
=======================================================
*/

calculatePointsAllowedPerGameScore(
  stats = {}
) {
  const pointsAllowedPerGame =
    this.number(
      stats.pointsAllowedPerGame,
      22
    );

  return this.round(
    this.normalize(
      pointsAllowedPerGame,
      32,
      14,
      false
    )
  );
},

  /*
  =======================================================
  SCORE COMPLETE TEAM
  =======================================================
  */

  scoreTeam(team = {}) {
  const passing =
    this.calculatePassingScore(
      team.passing || {}
    );

  const rushing =
    this.calculateRushingScore(
      team.rushing || {}
    );

  const receiving =
    this.calculateReceivingScore(
      team.receiving || {}
    );

  const defense =
    this.calculateDefenseScore(
      team.defense || {}
    );

  const scoring =
    team.scoring || {};

  const pointsPerGame =
    this.calculatePointsPerGameScore(
      scoring
    );

  const pointsAllowedPerGame =
    this.calculatePointsAllowedPerGameScore(
      scoring
    );

  let overall =
    passing *
      this.weights.passing +

    rushing *
      this.weights.rushing +

    receiving *
      this.weights.receiving +

    defense *
      this.weights.defense +

    pointsPerGame *
      this.weights.pointsPerGame +

    pointsAllowedPerGame *
      this.weights.pointsAllowedPerGame;

  const homeFieldBonus =
    team.isHome === true
      ? 1.5
      : 0;

  overall += homeFieldBonus;

  return {
    teamId:
      String(
        team.teamId || ""
      ),

    teamName:
      team.teamName ||
      "NFL Team",

    abbreviation:
      team.abbreviation ||
      "NFL",

    logo:
      team.logo || "",

    isHome:
      Boolean(team.isHome),

    passing,
    rushing,
    receiving,
    defense,
    pointsPerGame,
    pointsAllowedPerGame,

    rawPointsPerGame:
      this.round(
        scoring.pointsPerGame,
        1
      ),

    rawPointsAllowedPerGame:
      this.round(
        scoring.pointsAllowedPerGame,
        1
      ),

    homeFieldBonus,

    overall:
      this.round(
        this.clamp(overall),
        1
      )
  };
},
  /*
  =======================================================
  COMPARE CATEGORY

  Exact ties go to the home team.
  =======================================================
  */

  compareCategory(
    awayTeam,
    homeTeam,
    category
  ) {
    const awayScore = this.number(
      awayTeam[category]
    );

    const homeScore = this.number(
      homeTeam[category]
    );

    const winner =
      awayScore > homeScore
        ? "away"
        : "home";

    return {
      category,
      winner,

      awayScore,
      homeScore,

      difference: this.round(
        Math.abs(
          awayScore - homeScore
        ),
        1
      )
    };
  },

  /*
  =======================================================
  CALCULATE CONFIDENCE

  Uses:
  - Overall rating gap
  - Checklist difference
  - Strong category advantages
  - Whether the pick won the passing or defense category
  =======================================================
  */

  calculateConfidence(
    awayTeam,
    homeTeam,
    comparisons,
    pickSide
  ) {
    const overallDifference =
      Math.abs(
        awayTeam.overall -
        homeTeam.overall
      );

    const awayWins =
      comparisons.filter(
        item =>
          item.winner === "away"
      ).length;

    const homeWins =
      comparisons.filter(
        item =>
          item.winner === "home"
      ).length;

    const checklistDifference =
      Math.abs(
        awayWins - homeWins
      );

    const strongAdvantages =
      comparisons.filter(
        item =>
          item.winner === pickSide &&
          item.difference >= 8
      ).length;

    const majorAdvantages =
      comparisons.filter(
        item =>
          item.winner === pickSide &&
          item.difference >= 15
      ).length;

    const passingEdge =
      comparisons.some(
        item =>
          item.category === "passing" &&
          item.winner === pickSide
      );

    const defenseEdge =
      comparisons.some(
        item =>
          item.category === "defense" &&
          item.winner === pickSide
      );

    let confidence =
      52 +
      overallDifference * 1.5 +
      checklistDifference * 2.4 +
      strongAdvantages * 1.4 +
      majorAdvantages * 1.2;

    if (passingEdge) {
      confidence += 1.5;
    }

    if (defenseEdge) {
      confidence += 1.5;
    }

    return this.round(
      this.clamp(
        confidence,
        52,
        92
      )
    );
  },

  /*
  =======================================================
  EVALUATE COMPLETE MATCHUP
  =======================================================
  */

  evaluateMatchup(
    awayTeamData = {},
    homeTeamData = {}
  ) {
    const awayTeam = this.scoreTeam({
      ...awayTeamData,
      isHome: false
    });

    const homeTeam = this.scoreTeam({
      ...homeTeamData,
      isHome: true
    });

    const comparisons =
      this.categoryKeys.map(
        category =>
          this.compareCategory(
            awayTeam,
            homeTeam,
            category
          )
      );

    const awayChecklist =
      comparisons.filter(
        comparison =>
          comparison.winner === "away"
      ).length;

    const homeChecklist =
      comparisons.filter(
        comparison =>
          comparison.winner === "home"
      ).length;

    /*
    Overall score decides the pick.

    An exact overall tie goes to the home team.
    */

    const pickSide =
      awayTeam.overall >
      homeTeam.overall
        ? "away"
        : "home";

    const pick =
      pickSide === "away"
        ? awayTeam
        : homeTeam;

    const opponent =
      pickSide === "away"
        ? homeTeam
        : awayTeam;

    const confidence =
      this.calculateConfidence(
        awayTeam,
        homeTeam,
        comparisons,
        pickSide
      );

    const reasons = comparisons
      .filter(
        comparison =>
          comparison.winner ===
          pickSide
      )
      .sort(
        (first, second) =>
          second.difference -
          first.difference
      )
      .slice(0, 4)
      .map(
        comparison => ({
          category:
            comparison.category,

          difference:
            comparison.difference
        })
      );

    return {
      awayTeam,
      homeTeam,

      comparisons,

      awayChecklist,
      homeChecklist,

      pickSide,
      pick,
      opponent,

      confidence,

      overallDifference:
        this.round(
          Math.abs(
            awayTeam.overall -
            homeTeam.overall
          ),
          1
        ),

      reasons
    };
  }
};

/*
=========================================================
MAKE FORMULA AVAILABLE TO OTHER FILES
=========================================================
*/

window.NFLMoneylineFormula =
  NFLMoneylineFormula;
