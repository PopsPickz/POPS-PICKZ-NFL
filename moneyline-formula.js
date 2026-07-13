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

- Scores each NFL team from 0–100 in every category
- Compares both teams
- Assigns a checkmark to the stronger team
- Calculates an overall score
- Selects the POPS moneyline pick
- Produces a confidence percentage

IMPORTANT

This file only handles calculations.

Data collection:
moneyline-data.js

Card display:
moneyline.js

Styling:
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
    passing: 0.22,
    rushing: 0.14,
    receiving: 0.14,
    defense: 0.22,
    specialTeams: 0.10,
    offensiveLine: 0.18
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

  clamp(value, minimum = 0, maximum = 100) {
    return Math.min(
      maximum,
      Math.max(minimum, this.number(value))
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

  average(values = []) {
    const validValues = values
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));

    if (!validValues.length) {
      return 50;
    }

    return (
      validValues.reduce(
        (total, value) => total + value,
        0
      ) / validValues.length
    );
  },

  /*
  =======================================================
  NORMALIZATION

  Converts
