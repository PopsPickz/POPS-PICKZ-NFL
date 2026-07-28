/*
=========================================================
POPS PICKZ NFL — MONEYLINE FORMULA
File: moneyline-formula.js
Version: 3.0 — RANKING-BASED FORMULA
=========================================================

CATEGORIES

1. Passing ranking
2. Rushing ranking
3. Receiving ranking
4. Defense ranking
5. Average Points Per Game ranking

RANKING RULE

- Rank #1 is best.
- A lower ranking number beats a higher ranking number.
- Example: Rank #3 beats Rank #7.
- Equal rankings produce a tie and neither team receives
  a checklist win.

POPS PICK RULE

1. The team with more checklist wins is the POPS Pick.
2. If checklist wins are tied, use the higher overall
   ranking rating.
3. If the checklist and overall rating are tied, select
   the home team.

PURPOSE

- Reads automatic NFL rankings from moneyline-data.js
- Compares teams in five ranked categories
- Awards checklist wins
- Calculates an overall ranking rating
- Selects the POPS Pick
- Calculates confidence
- Supplies rank advantages to moneyline.js
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
    passing: 0.24,
    rushing: 0.18,
    receiving: 0.18,
    defense: 0.24,
    pointsPerGame: 0.16
  },

  categoryKeys: [
    "passing",
    "rushing",
    "receiving",
    "defense",
    "pointsPerGame"
  ],

  /*
  =======================================================
  GENERAL HELPERS
  =======================================================
  */

  number(value, fallback = 0) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  },

  clamp(
    value,
    minimum = 0,
    maximum = 100
  ) {
    const numericValue =
      this.number(value);

    return Math.min(
      maximum,
      Math.max(
        minimum,
        numericValue
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

  /*
  =======================================================
  SAFE RANK

  Rankings should normally be 1–32.

  Missing or invalid rankings are treated as Rank #32.
  =======================================================
  */

  getRank(team = {}, category = "") {
    const rank =
      this.number(
        team?.rankings?.[category],
        32
      );

    return Math.min(
      32,
      Math.max(
        1,
        Math.round(rank)
      )
    );
  },

  /*
  =======================================================
  RANK TO 0–100 SCORE

  Rank #1  = 100
  Rank #32 = approximately 3.1

  This score is only used for the Overall Rating and
  confidence calculation.

  Checklist wins are determined directly by rank.
  =======================================================
  */

  rankToScore(rank) {
    const safeRank =
      Math.min(
        32,
        Math.max(
          1,
          this.number(rank, 32)
        )
      );

    return this.round(
      (
        (33 - safeRank) /
        32
      ) * 100,
      1
    );
  },

  /*
  =======================================================
  SCORE COMPLETE TEAM FROM RANKINGS
  =======================================================
  */

  scoreTeam(team = {}) {
    const passingRank =
      this.getRank(
        team,
        "passing"
      );

    const rushingRank =
      this.getRank(
        team,
        "rushing"
      );

    const receivingRank =
      this.getRank(
        team,
        "receiving"
      );

    const defenseRank =
      this.getRank(
        team,
        "defense"
      );

    const pointsPerGameRank =
      this.getRank(
        team,
        "pointsPerGame"
      );

    /*
    Convert each ranking to a 0–100 score for the
    Overall Rating.

    The checklist still uses the actual ranking numbers.
    */

    const passingScore =
      this.rankToScore(
        passingRank
      );

    const rushingScore =
      this.rankToScore(
        rushingRank
      );

    const receivingScore =
      this.rankToScore(
        receivingRank
      );

    const defenseScore =
      this.rankToScore(
        defenseRank
      );

    const pointsPerGameScore =
      this.rankToScore(
        pointsPerGameRank
      );

    let overall =
      passingScore *
        this.weights.passing +

      rushingScore *
        this.weights.rushing +

      receivingScore *
        this.weights.receiving +

      defenseScore *
        this.weights.defense +

      pointsPerGameScore *
        this.weights.pointsPerGame;

    /*
    Home-field advantage is only an overall-rating
    tiebreaker.

    It cannot override a team that wins more checklist
    categories.
    */

    const homeFieldBonus =
      team.isHome === true
        ? 1.5
        : 0;

    overall +=
      homeFieldBonus;

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
        Boolean(
          team.isHome
        ),

      /*
      Keep the actual rankings attached to the scored
      team.
      */

      rankings: {
        passing:
          passingRank,

        rushing:
          rushingRank,

        receiving:
          receivingRank,

        defense:
          defenseRank,

        pointsPerGame:
          pointsPerGameRank
      },

      /*
      Keep the real statistics behind each ranking.
      */

      rankingValues: {
        passing:
          this.number(
            team?.rankingValues
              ?.passing
          ),

        rushing:
          this.number(
            team?.rankingValues
              ?.rushing
          ),

        receiving:
          this.number(
            team?.rankingValues
              ?.receiving
          ),

        defense:
          this.number(
            team?.rankingValues
              ?.defense
          ),

        pointsPerGame:
          this.number(
            team?.rankingValues
              ?.pointsPerGame
          )
      },

      /*
      Individual rank-based rating scores.
      */

      rankingScores: {
        passing:
          passingScore,

        rushing:
          rushingScore,

        receiving:
          receivingScore,

        defense:
          defenseScore,

        pointsPerGame:
          pointsPerGameScore
      },

      /*
      These properties remain available for compatibility
      with other site files.

      They now contain ranking numbers rather than the old
      formula scores.
      */

      passing:
        passingRank,

      rushing:
        rushingRank,

      receiving:
        receivingRank,

      defense:
        defenseRank,

      pointsPerGame:
        pointsPerGameRank,

      rawPointsPerGame:
        this.number(
          team?.rankingValues
            ?.pointsPerGame
        ),

      rawPointsAllowedPerGame:
        this.number(
          team?.rankingValues
            ?.defense
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
  COMPARE ONE RANKING CATEGORY

  Lower rank is better.

  Example:

  Away: Rank #3
  Home: Rank #7
  Winner: Away

  Equal rankings produce a tie.
  =======================================================
  */

  compareCategory(
    awayTeam,
    homeTeam,
    category
  ) {
    const awayRank =
      this.getRank(
        awayTeam,
        category
      );

    const homeRank =
      this.getRank(
        homeTeam,
        category
      );

    let winner =
      "tie";

    if (awayRank < homeRank) {
      winner =
        "away";
    } else if (
      homeRank < awayRank
    ) {
      winner =
        "home";
    }

    const rankDifference =
      Math.abs(
        awayRank -
        homeRank
      );

    return {
      category,
      winner,

      /*
      Ranking fields used by moneyline.js.
      */

      awayRank,
      homeRank,

      /*
      Compatibility fields.
      */

      awayScore:
        awayRank,

      homeScore:
        homeRank,

      /*
      Difference means number of ranking positions.
      */

      difference:
        rankDifference,

      rankDifference,

      /*
      Real statistical values behind the ranking.
      */

      awayValue:
        this.number(
          awayTeam
            ?.rankingValues
            ?.[category]
        ),

      homeValue:
        this.number(
          homeTeam
            ?.rankingValues
            ?.[category]
        )
    };
  },

  /*
  =======================================================
  SELECT POPS PICK

  Rule 1:
  More checklist wins determines the POPS Pick.

  Rule 2:
  If checklist totals are tied, use the higher overall
  rating.

  Rule 3:
  If everything remains tied, select the home team.
  =======================================================
  */

  selectPickSide(
    awayTeam,
    homeTeam,
    awayChecklist,
    homeChecklist
  ) {
    if (
      awayChecklist >
      homeChecklist
    ) {
      return "away";
    }

    if (
      homeChecklist >
      awayChecklist
    ) {
      return "home";
    }

    if (
      awayTeam.overall >
      homeTeam.overall
    ) {
      return "away";
    }

    if (
      homeTeam.overall >
      awayTeam.overall
    ) {
      return "home";
    }

    return "home";
  },

  /*
  =======================================================
  CALCULATE CONFIDENCE

  Confidence uses:

  - Checklist advantage
  - Overall rating difference
  - Ranking gaps
  - Important category wins
  =======================================================
  */

  calculateConfidence(
    awayTeam,
    homeTeam,
    comparisons,
    pickSide
  ) {
    const validComparisons =
      Array.isArray(comparisons)
        ? comparisons
        : [];

    const overallDifference =
      Math.abs(
        this.number(
          awayTeam?.overall
        ) -
        this.number(
          homeTeam?.overall
        )
      );

    const awayWins =
      validComparisons.filter(
        item =>
          item.winner ===
          "away"
      ).length;

    const homeWins =
      validComparisons.filter(
        item =>
          item.winner ===
          "home"
      ).length;

    const checklistDifference =
      Math.abs(
        awayWins -
        homeWins
      );

    /*
    A meaningful ranking advantage is at least
    five ranking positions.
    */

    const strongAdvantages =
      validComparisons.filter(
        item =>
          item.winner ===
            pickSide &&
          item.rankDifference >= 5
      ).length;

    /*
    A major ranking advantage is at least
    ten ranking positions.
    */

    const majorAdvantages =
      validComparisons.filter(
        item =>
          item.winner ===
            pickSide &&
          item.rankDifference >= 10
      ).length;

    const totalRankAdvantage =
      validComparisons
        .filter(
          item =>
            item.winner ===
            pickSide
        )
        .reduce(
          (total, item) =>
            total +
            this.number(
              item.rankDifference
            ),
          0
        );

    const passingEdge =
      validComparisons.some(
        item =>
          item.category ===
            "passing" &&
          item.winner ===
            pickSide
      );

    const defenseEdge =
      validComparisons.some(
        item =>
          item.category ===
            "defense" &&
          item.winner ===
            pickSide
      );

    const scoringEdge =
      validComparisons.some(
        item =>
          item.category ===
            "pointsPerGame" &&
          item.winner ===
            pickSide
      );

    let confidence =
      52 +
      checklistDifference * 4 +
      overallDifference * 0.35 +
      totalRankAdvantage * 0.25 +
      strongAdvantages * 1.25 +
      majorAdvantages * 1.5;

    if (passingEdge) {
      confidence += 1;
    }

    if (defenseEdge) {
      confidence += 1.5;
    }

    if (scoringEdge) {
      confidence += 1;
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
  BUILD REASONS
  =======================================================
  */

  buildReasons(
    comparisons = [],
    pickSide = ""
  ) {
    return comparisons
      .filter(
        comparison =>
          comparison.winner ===
          pickSide
      )
      .sort(
        (first, second) =>
          second.rankDifference -
          first.rankDifference
      )
      .slice(0, 4)
      .map(
        comparison => {
          const pickRank =
            pickSide === "away"
              ? comparison.awayRank
              : comparison.homeRank;

          const opponentRank =
            pickSide === "away"
              ? comparison.homeRank
              : comparison.awayRank;

          const pickValue =
            pickSide === "away"
              ? comparison.awayValue
              : comparison.homeValue;

          const opponentValue =
            pickSide === "away"
              ? comparison.homeValue
              : comparison.awayValue;

          return {
            category:
              comparison.category,

            difference:
              comparison.rankDifference,

            rankDifference:
              comparison.rankDifference,

            pickRank,
            opponentRank,
            pickValue,
            opponentValue
          };
        }
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
    const awayTeam =
      this.scoreTeam({
        ...awayTeamData,
        isHome: false
      });

    const homeTeam =
      this.scoreTeam({
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

    /*
    Tied categories do not count for either team.
    */

    const awayChecklist =
      comparisons.filter(
        comparison =>
          comparison.winner ===
          "away"
      ).length;

    const homeChecklist =
      comparisons.filter(
        comparison =>
          comparison.winner ===
          "home"
      ).length;

    const tiedCategories =
      comparisons.filter(
        comparison =>
          comparison.winner ===
          "tie"
      ).length;

    /*
    More checklist wins always determines the POPS Pick.

    Overall rating is only used when the checklist is
    tied.
    */

    const pickSide =
      this.selectPickSide(
        awayTeam,
        homeTeam,
        awayChecklist,
        homeChecklist
      );

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

    const reasons =
      this.buildReasons(
        comparisons,
        pickSide
      );

    return {
      awayTeam,
      homeTeam,
      comparisons,

      awayChecklist,
      homeChecklist,
      tiedCategories,

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