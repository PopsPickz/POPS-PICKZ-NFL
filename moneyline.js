/*
=========================================================
POPS PICKZ NFL — MONEYLINE CARDS
File: moneyline.js
Version: 3.0 — RANKING DISPLAY
=========================================================

UPDATES

- Displays NFL team ranks instead of old category scores
- Rank #1 is the best
- Lower ranking receives the ✅
- Equal rankings receive ➖
- More checklist wins determines the POPS Pick
- Displays the actual statistic behind every ranking
- Displays ranking-position advantages
- Uses five total categories

REQUIRED SCRIPT ORDER

<script src="moneyline-data.js"></script>
<script src="moneyline-formula.js"></script>
<script src="moneyline.js"></script>
=========================================================
*/

const NFLMoneyline = {
  box: null,
  matchups: [],
  refreshTimer: null,

  settings: {
    refreshInterval:
      15 * 60 * 1000,

    maximumGames:
      16
  },

  categoryLabels: {
    passing:
      "Passing",

    rushing:
      "Rushing",

    receiving:
      "Receiving",

    defense:
      "Defense",

    pointsPerGame:
      "Avg Points/Game"
  },

  categoryIcons: {
    passing:
      "🏈",

    rushing:
      "🏃",

    receiving:
      "🙌",

    defense:
      "🛡️",

    pointsPerGame:
      "🔥"
  },

  /*
  =======================================================
  INITIALIZE
  =======================================================
  */

  async init() {
    this.box =
      document.getElementById(
        "moneylineBox"
      );

    if (!this.box) {
      console.warn(
        "POPS NFL Moneyline: moneylineBox was not found."
      );

      return;
    }

    if (
      typeof window
        .NFLMoneylineFormula ===
      "undefined"
    ) {
      this.showError(
        "moneyline-formula.js is not connected."
      );

      return;
    }

    if (
      typeof window
        .NFLMoneylineData ===
      "undefined"
    ) {
      this.showError(
        "moneyline-data.js is not connected."
      );

      return;
    }

    await this.load();

    this.startAutomaticRefresh();
  },

  /*
  =======================================================
  LOAD AND EVALUATE MATCHUPS
  =======================================================
  */

  async load() {
    this.showLoading();

    try {
      const loadedMatchups =
        await window
          .NFLMoneylineData
          .loadMoneylineMatchups();

      this.matchups =
        loadedMatchups
          .slice(
            0,
            this.settings
              .maximumGames
          )
          .map(matchup =>
            this.evaluateMatchup(
              matchup
            )
          )
          .filter(Boolean);

      if (
        !this.matchups.length
      ) {
        throw new Error(
          "No NFL moneyline matchups are currently available."
        );
      }

      this.render();
    } catch (error) {
      console.error(
        "POPS NFL Moneyline loading error:",
        error
      );

      this.showError(
        error?.message ||
        "NFL moneyline picks could not be loaded."
      );
    }
  },

  evaluateMatchup(matchup) {
    try {
      const result =
        window
          .NFLMoneylineFormula
          .evaluateMatchup(
            matchup.awayTeamData,
            matchup.homeTeamData
          );

      return {
        ...matchup,
        result
      };
    } catch (error) {
      console.warn(
        `Moneyline formula failed for ${matchup.name}:`,
        error
      );

      return null;
    }
  },

  /*
  =======================================================
  MAIN RENDER
  =======================================================
  */

  render() {
    if (!this.box) {
      return;
    }

    this.box.innerHTML = `
      <div class="moneyline-summary-bar">

        <div>
          <strong>
            ${this.matchups.length}
          </strong>

          <span>
            NFL Matchups Evaluated
          </span>
        </div>

        <div>
          <strong>
            ${this.getAverageConfidence()}%
          </strong>

          <span>
            Average Confidence
          </span>
        </div>

        <div>
          <strong>
            5
          </strong>

          <span>
            Rankings Compared
          </span>
        </div>

      </div>

      <div class="moneyline-card-grid">
        ${this.matchups
          .map(matchup =>
            this.renderMatchupCard(
              matchup
            )
          )
          .join("")}
      </div>
    `;
  },

  /*
  =======================================================
  MATCHUP CARD
  =======================================================
  */

  renderMatchupCard(matchup) {
    const result =
      matchup.result;

    if (!result) {
      return "";
    }

    const away =
      result.awayTeam;

    const home =
      result.homeTeam;

    const pick =
      result.pick;

    const awayChecklist =
      this.number(
        result.awayChecklist
      );

    const homeChecklist =
      this.number(
        result.homeChecklist
      );

    const tiedCategories =
      this.number(
        result.tiedCategories
      );

    const checklistText =
      `${awayChecklist} - ${homeChecklist}`;

    const pickSideLabel =
      result.pickSide ===
      "home"
        ? "HOME"
        : "AWAY";

    const overallDifference =
      this.round(
        result.overallDifference,
        1
      );

    const edgeText =
      overallDifference > 0
        ? `+${overallDifference}`
        : `${overallDifference}`;

    return `
      <article class="moneyline-card">

        <div class="moneyline-card-header">

          <div class="moneyline-matchup-info">

            <p class="moneyline-game-label">
              ${this.escapeHTML(
                this.getGameStatus(
                  matchup
                )
              )}
            </p>

            <h3>
              ${this.escapeHTML(
                away.teamName
              )}

              <span>
                vs
              </span>

              ${this.escapeHTML(
                home.teamName
              )}
            </h3>

            <p class="moneyline-game-time">
              ⏰
              ${this.escapeHTML(
                window
                  .NFLMoneylineData
                  .formatGameTime(
                    matchup.startTime
                  )
              )}
            </p>

          </div>

          <div class="moneyline-confidence-badge">
            <strong>
              ${this.number(
                result.confidence
              )}%
            </strong>

            <span>
              Confidence
            </span>
          </div>

        </div>

        <div class="moneyline-pick-banner">
          <span>
            💰 POPS Pick
          </span>

          <strong>
            ${this.escapeHTML(
              pick?.teamName ||
              "No Pick"
            )}
          </strong>

          <small>
            ${pickSideLabel}
          </small>
        </div>

     <div class="moneyline-checklist-summary">

  <span>
    Checklist
  </span>

  <strong>
    ${checklistText}
  </strong>

  <span>
    Overall Edge
  </span>

  <strong>
    ${edgeText}
  </strong>

  ${
    tiedCategories > 0
      ? `
        <span>
          Tied Rankings
        </span>

        <strong>
          ${tiedCategories}
        </strong>
      `
      : ""
  }

</div>

${this.renderHeadToHead(
  matchup
)}

<div class="moneyline-team-comparison">

          <div class="moneyline-team-grid">

            ${this.renderTeamPanel(
              away,
              home,
              result.comparisons,
              "away",
              result.pickSide,
              matchup
            )}

            ${this.renderTeamPanel(
              home,
              away,
              result.comparisons,
              "home",
              result.pickSide,
              matchup
            )}

          </div>

          <div
            class="moneyline-versus-badge"
            aria-hidden="true"
          >
            VS
          </div>

        </div>

        ${this.renderReasons(
          result
        )}

      </article>
    `;
  },

  /*
  =======================================================
  TEAM PANEL
  =======================================================
  */

  renderTeamPanel(
    team,
    opponent,
    comparisons,
    side,
    pickSide,
    matchup
  ) {
    const isPick =
      side === pickSide;

    const validComparisons =
      Array.isArray(
        comparisons
      )
        ? comparisons
        : [];

    const overall =
      this.round(
        team?.overall,
        1
      );

    const checklistWins =
      validComparisons.filter(
        comparison =>
          comparison.winner ===
          side
      ).length;

    return `
      <section
        class="
          moneyline-team-panel
          moneyline-team-panel-${side}
          ${
            isPick
              ? "moneyline-selected-team"
              : ""
          }
        "
        data-side="${side}"
      >

        <div class="moneyline-team-heading">

          <div class="moneyline-team-logo-wrap">
            ${this.renderTeamLogo(
              team,
              matchup
            )}
          </div>

          <div class="moneyline-team-heading-text">

            <h4>
              ${this.escapeHTML(
                team?.teamName ||
                "NFL Team"
              )}
            </h4>

            <p>
              ${
                side === "home"
                  ? "Home Team"
                  : "Away Team"
              }
            </p>

          </div>

          ${
            isPick
              ? `
                <span class="moneyline-pick-tag">
                  POPS PICK
                </span>
              `
              : ""
          }

        </div>

        <div class="moneyline-overall-score">

          <span>
            Rank Rating
          </span>

          <strong>
            ${overall}
          </strong>

          <small>
            ${checklistWins}
            ${
              checklistWins === 1
                ? "check"
                : "checks"
            }
          </small>

          <div class="moneyline-score-bar">
            <span
              style="width: ${this.clamp(
                overall
              )}%"
            ></span>
          </div>

        </div>

        <div class="moneyline-category-list">
          ${validComparisons
            .map(comparison =>
              this.renderCategoryRow(
                team,
                opponent,
                comparison,
                side
              )
            )
            .join("")}
        </div>

        ${
          this.number(
            team?.homeFieldBonus
          ) > 0
            ? `
              <div class="moneyline-home-bonus">
                🏟️ Home-field bonus:
                +${this.number(
                  team.homeFieldBonus
                )}
              </div>
            `
            : ""
        }

      </section>
    `;
  },

  /*
  =======================================================
  TEAM LOGO
  =======================================================
  */

  renderTeamLogo(
    team,
    matchup
  ) {
    const teamId =
      String(
        team?.teamId || ""
      );

    let gameTeam =
      null;

    if (
      String(
        matchup?.away?.teamId ||
        ""
      ) === teamId
    ) {
      gameTeam =
        matchup.away;
    }

    if (
      String(
        matchup?.home?.teamId ||
        ""
      ) === teamId
    ) {
      gameTeam =
        matchup.home;
    }

    const logo =
      gameTeam?.logo ||
      team?.logo ||
      "";

    if (logo) {
      return `
        <img
          src="${this.escapeHTML(
            logo
          )}"
          alt="${this.escapeHTML(
            team?.teamName ||
            "NFL Team"
          )}"
          class="moneyline-team-logo"
          loading="lazy"
        />
      `;
    }

    return `
      <span class="moneyline-logo-fallback">
        🏈
      </span>
    `;
  },

  /*
  =======================================================
  CATEGORY COMPARISON ROW

  Lower ranking is better.

  Example:

  Rank #3 receives ✅ over Rank #7.
  =======================================================
  */

  renderCategoryRow(
    team,
    opponent,
    comparison,
    side
  ) {
    const category =
      comparison?.category;

    if (!category) {
      return "";
    }

    const teamRank =
      side === "away"
        ? this.number(
            comparison.awayRank,
            32
          )
        : this.number(
            comparison.homeRank,
            32
          );

    const opponentRank =
      side === "away"
        ? this.number(
            comparison.homeRank,
            32
          )
        : this.number(
            comparison.awayRank,
            32
          );

    const teamValue =
      side === "away"
        ? this.number(
            comparison.awayValue
          )
        : this.number(
            comparison.homeValue
          );

    const opponentValue =
      side === "away"
        ? this.number(
            comparison.homeValue
          )
        : this.number(
            comparison.awayValue
          );

    const rankDifference =
      Math.abs(
        teamRank -
        opponentRank
      );

    const isTie =
      comparison.winner ===
      "tie";

    const teamWon =
      comparison.winner ===
      side;

    let statusIcon =
      "❌";

    let resultClass =
      "moneyline-category-loss";

    if (isTie) {
      statusIcon =
        "➖";

      resultClass =
        "moneyline-category-tie";
    } else if (teamWon) {
      statusIcon =
        "✅";

      resultClass =
        "moneyline-category-win";
    }

    let rankEdgeText =
      `${rankDifference} spots worse`;

    if (isTie) {
      rankEdgeText =
        "Same rank";
    } else if (teamWon) {
      rankEdgeText =
        `${rankDifference} spots better`;
    }

    const valueText =
      this.formatCategoryValue(
        category,
        teamValue
      );

    const opponentValueText =
      this.formatCategoryValue(
        category,
        opponentValue
      );

    return `
      <div
        class="
          moneyline-category-row
          ${resultClass}
        "
      >

        <div class="moneyline-category-name">

          <span>
            ${
              this.categoryIcons[
                category
              ] || "📊"
            }
          </span>

          <strong>
            ${this.escapeHTML(
              this.categoryLabels[
                category
              ] ||
              category
            )}
          </strong>

        </div>

        <div class="moneyline-category-result">

          <span class="moneyline-result-icon">
            ${statusIcon}
          </span>

          <strong>
            Rank #${teamRank}
          </strong>

          <small>
            ${this.escapeHTML(
              rankEdgeText
            )}
          </small>

          <small class="moneyline-category-stat">
            ${this.escapeHTML(
              valueText
            )}
          </small>

          <small class="moneyline-category-opponent-stat">
            Opponent:
            ${this.escapeHTML(
              opponentValueText
            )}
          </small>

        </div>

      </div>
    `;
  },

  /*
  =======================================================
  FORMAT ACTUAL CATEGORY STATISTIC
  =======================================================
  */

  formatCategoryValue(
    category,
    value
  ) {
    const safeValue =
      this.round(
        value,
        1
      );

    if (
      category ===
      "passing"
    ) {
      return `${safeValue} pass yards/game`;
    }

    if (
      category ===
      "rushing"
    ) {
      return `${safeValue} rush yards/game`;
    }

    if (
      category ===
      "receiving"
    ) {
      return `${safeValue} receiving yards/game`;
    }

    if (
      category ===
      "defense"
    ) {
      return `${safeValue} points allowed/game`;
    }

    if (
      category ===
      "pointsPerGame"
    ) {
      return `${safeValue} points/game`;
    }

    return `${safeValue}`;
  },

  /*
  =======================================================
  REASONS SECTION
  =======================================================
  */

  renderReasons(result) {
    const reasons =
      Array.isArray(
        result?.reasons
      )
        ? result.reasons
        : [];

    if (!reasons.length) {
      return "";
    }

    return `
      <div class="moneyline-reasons">

        <h4>
          🔥 Why POPS Likes
          ${this.escapeHTML(
            result.pick?.teamName ||
            "This Team"
          )}
        </h4>

        <div class="moneyline-reason-grid">

          ${reasons
            .map(reason => {
              const categoryLabel =
                this.categoryLabels[
                  reason.category
                ] ||
                reason.category;

              const pickRank =
                this.number(
                  reason.pickRank,
                  32
                );

              const opponentRank =
                this.number(
                  reason.opponentRank,
                  32
                );

              const rankDifference =
                this.number(
                  reason.rankDifference
                );

              return `
                <div class="moneyline-reason">

                  <span>
                    ${
                      this.categoryIcons[
                        reason.category
                      ] || "✅"
                    }
                  </span>

                  <div>

                    <strong>
                      Better
                      ${this.escapeHTML(
                        categoryLabel
                      )}
                      Ranking
                    </strong>

                    <small>
                      Rank #${pickRank}
                      vs Rank #${opponentRank}
                    </small>

                    <small>
                      ${rankDifference}
                      ${
                        rankDifference === 1
                          ? "ranking spot"
                          : "ranking spots"
                      }
                      better
                    </small>

                  </div>

                </div>
              `;
            })
            .join("")}

        </div>

      </div>
    `;
  },

  /*
  =======================================================
  STATUS
  =======================================================
  */

  getGameStatus(matchup) {
    if (matchup.completed) {
      return "FINAL";
    }

    if (
      matchup.state === "in"
    ) {
      return "🔴 LIVE";
    }

    return `WEEK ${
      matchup.week || "NFL"
    }`;
  },

  /*
  =======================================================
  REFRESH
  =======================================================
  */

  startAutomaticRefresh() {
    if (this.refreshTimer) {
      clearInterval(
        this.refreshTimer
      );
    }

    this.refreshTimer =
      setInterval(
        () => {
          this.load();
        },
        this.settings
          .refreshInterval
      );
  },

  /*
  =======================================================
  LOADING AND ERROR
  =======================================================
  */

  showLoading() {
    if (!this.box) {
      return;
    }

    this.box.innerHTML = `
      <div class="moneyline-loading">

        <div class="moneyline-spinner">
        </div>

        <h3>
          Calculating NFL moneyline picks...
        </h3>

        <p>
          Ranking all NFL teams in passing,
          rushing, receiving, defense and
          average points per game.
        </p>

      </div>
    `;
  },

  showError(message) {
    if (!this.box) {
      return;
    }

    this.box.innerHTML = `
      <div class="moneyline-error">

        <h3>
          ⚠️ NFL moneyline picks did not load
        </h3>

        <p>
          ${this.escapeHTML(
            message
          )}
        </p>

        <button
          type="button"
          id="moneylineRetryButton"
        >
          Try Again
        </button>

      </div>
    `;

    const retryButton =
      document.getElementById(
        "moneylineRetryButton"
      );

    if (retryButton) {
      retryButton.addEventListener(
        "click",
        () => this.load()
      );
    }
  },

  /*
  =======================================================
  HELPERS
  =======================================================
  */

  getAverageConfidence() {
    if (
      !this.matchups.length
    ) {
      return 0;
    }

    const total =
      this.matchups.reduce(
        (
          sum,
          matchup
        ) =>
          sum +
          this.number(
            matchup.result
              ?.confidence
          ),
        0
      );

    return this.round(
      total /
      this.matchups.length
    );
  },

  number(
    value,
    fallback = 0
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : fallback;
  },

  round(
    value,
    decimals = 0
  ) {
    const multiplier =
      10 ** decimals;

    return (
      Math.round(
        this.number(value) *
        multiplier
      ) / multiplier
    );
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

  escapeHTML(value) {
    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }
};

/*
=========================================================
START NFL MONEYLINE
=========================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  () => {
    NFLMoneyline.init();
  }
);
