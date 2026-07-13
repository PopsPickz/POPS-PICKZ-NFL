/*
=========================================================
POPS PICKZ NFL — MONEYLINE CARDS
File: moneyline.js
Version: 1.0
=========================================================

PURPOSE

- Loads NFL matchups from moneyline-data.js
- Sends each matchup into moneyline-formula.js
- Renders the predicted moneyline winner
- Displays six category comparisons
- Shows team overall scores
- Shows POPS confidence and reasons

REQUIRED SCRIPT ORDER

<script src="moneyline-formula.js"></script>
<script src="moneyline-data.js"></script>
<script src="moneyline.js"></script>
=========================================================
*/

const NFLMoneyline = {
  box: null,
  matchups: [],
  refreshTimer: null,

  settings: {
    refreshInterval: 15 * 60 * 1000,
    maximumGames: 16
  },

  categoryLabels: {
    passing: "Passing",
    rushing: "Rushing",
    receiving: "Receiving",
    defense: "Defense",
    specialTeams: "Special Teams",
    offensiveLine: "Offensive Line"
  },

  categoryIcons: {
    passing: "🏈",
    rushing: "🏃",
    receiving: "🙌",
    defense: "🛡️",
    specialTeams: "🦵",
    offensiveLine: "🧱"
  },

  /*
  =======================================================
  INITIALIZE
  =======================================================
  */

  async init() {
    this.box = document.getElementById(
      "moneylineBox"
    );

    if (!this.box) {
      console.warn(
        "POPS NFL Moneyline: moneylineBox was not found."
      );

      return;
    }

    if (
      typeof window.NFLMoneylineFormula ===
      "undefined"
    ) {
      this.showError(
        "moneyline-formula.js is not connected."
      );

      return;
    }

    if (
      typeof window.NFLMoneylineData ===
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
        await window.NFLMoneylineData
          .loadMoneylineMatchups();

      this.matchups = loadedMatchups
        .slice(
          0,
          this.settings.maximumGames
        )
        .map(matchup =>
          this.evaluateMatchup(matchup)
        )
        .filter(Boolean);

      if (!this.matchups.length) {
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
        window.NFLMoneylineFormula
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
            6
          </strong>

          <span>
            Categories Compared
          </span>
        </div>
      </div>

      <div class="moneyline-card-grid">
        ${this.matchups
          .map(matchup =>
            this.renderMatchupCard(matchup)
          )
          .join("")}
      </div>
    `;
  },

  renderMatchupCard(matchup) {
    const result = matchup.result;

    const away = result.awayTeam;
    const home = result.homeTeam;

    const pick = result.pick;

    const checklistText =
      `${result.awayChecklist} - ` +
      `${result.homeChecklist}`;

    const pickSideLabel =
      result.pickSide === "home"
        ? "HOME"
        : "AWAY";

    return `
      <article class="moneyline-card">

        <div class="moneyline-card-header">

          <div>
            <p class="moneyline-game-label">
              ${this.escapeHTML(
                this.getGameStatus(matchup)
              )}
            </p>

            <h3>
              ${this.escapeHTML(
                away.teamName
              )}
              <span>vs</span>
              ${this.escapeHTML(
                home.teamName
              )}
            </h3>

            <p class="moneyline-game-time">
              ⏰
              ${this.escapeHTML(
                window.NFLMoneylineData
                  .formatGameTime(
                    matchup.startTime
                  )
              )}
            </p>
          </div>

          <div class="moneyline-confidence-badge">
            <strong>
              ${result.confidence}%
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
              pick.teamName
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
            +${result.overallDifference}
          </strong>
        </div>

        <div class="moneyline-team-comparison">

          ${this.renderTeamPanel(
            away,
            home,
            result.comparisons,
            "away",
            result.pickSide
          )}

          <div class="moneyline-versus-divider">
            VS
          </div>

          ${this.renderTeamPanel(
            home,
            away,
            result.comparisons,
            "home",
            result.pickSide
          )}

        </div>

        ${this.renderReasons(result)}

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
    pickSide
  ) {
    const isPick =
      side === pickSide;

    return `
      <section
        class="
          moneyline-team-panel
          ${isPick
            ? "moneyline-selected-team"
            : ""}
        "
      >

        <div class="moneyline-team-heading">

          <div class="moneyline-team-logo-wrap">
            ${this.renderTeamLogo(team)}
          </div>

          <div>
            <h4>
              ${this.escapeHTML(
                team.teamName
              )}
            </h4>

            <p>
              ${team.isHome
                ? "Home Team"
                : "Away Team"}
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
            Overall Rating
          </span>

          <strong>
            ${team.overall}
          </strong>

          <div class="moneyline-score-bar">
            <span
              style="width: ${this.clamp(
                team.overall
              )}%"
            ></span>
          </div>
        </div>

        <div class="moneyline-category-list">
          ${comparisons
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
          team.homeFieldBonus > 0
            ? `
              <div class="moneyline-home-bonus">
                🏟️ Home-field bonus:
                +${team.homeFieldBonus}
              </div>
            `
            : ""
        }

      </section>
    `;
  },

  renderTeamLogo(team) {
    const matchupTeam =
      this.findMatchupTeam(team.teamId);

    const logo =
      matchupTeam?.logo || "";

    if (logo) {
      return `
        <img
          src="${this.escapeHTML(logo)}"
          alt="${this.escapeHTML(
            team.teamName
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

  findMatchupTeam(teamId) {
    for (const matchup of this.matchups) {
      if (
        matchup.away.teamId === teamId
      ) {
        return matchup.away;
      }

      if (
        matchup.home.teamId === teamId
      ) {
        return matchup.home;
      }
    }

    return null;
  },

  /*
  =======================================================
  CATEGORY COMPARISON ROW
  =======================================================
  */

  renderCategoryRow(
    team,
    opponent,
    comparison,
    side
  ) {
    const category =
      comparison.category;

    const teamScore =
      this.number(team[category]);

    const opponentScore =
      this.number(opponent[category]);

    const teamWon =
      comparison.winner === side;

    const statusIcon =
      teamWon
        ? "✅"
        : "❌";

    const advantageText =
      teamWon
        ? `+${this.round(
            teamScore -
            opponentScore,
            1
          )}`
        : `${this.round(
            teamScore -
            opponentScore,
            1
          )}`;

    return `
      <div
        class="
          moneyline-category-row
          ${teamWon
            ? "moneyline-category-win"
            : "moneyline-category-loss"}
        "
      >

        <div class="moneyline-category-name">
          <span>
            ${this.categoryIcons[category] || "📊"}
          </span>

          <strong>
            ${this.escapeHTML(
              this.categoryLabels[category] ||
              category
            )}
          </strong>
        </div>

        <div class="moneyline-category-result">
          <span class="moneyline-result-icon">
            ${statusIcon}
          </span>

          <strong>
            ${teamScore}
          </strong>

          <small>
            ${advantageText}
          </small>
        </div>

      </div>
    `;
  },

  /*
  =======================================================
  REASONS SECTION
  =======================================================
  */

  renderReasons(result) {
    if (!result.reasons.length) {
      return "";
    }

    return `
      <div class="moneyline-reasons">

        <h4>
          🔥 Why POPS Likes
          ${this.escapeHTML(
            result.pick.teamName
          )}
        </h4>

        <div class="moneyline-reason-grid">
          ${result.reasons
            .map(reason => `
              <div class="moneyline-reason">
                <span>
                  ${this.categoryIcons[
                    reason.category
                  ] || "✅"}
                </span>

                <div>
                  <strong>
                    Better
                    ${this.escapeHTML(
                      this.categoryLabels[
                        reason.category
                      ] ||
                      reason.category
                    )}
                  </strong>

                  <small>
                    +${reason.difference}
                    category edge
                  </small>
                </div>
              </div>
            `)
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

    if (matchup.state === "in") {
      return "🔴 LIVE";
    }

    return `WEEK ${matchup.week || "NFL"}`;
  },

  /*
  =======================================================
  REFRESH
  =======================================================
  */

  startAutomaticRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(
      () => {
        this.load();
      },
      this.settings.refreshInterval
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

        <div class="moneyline-spinner"></div>

        <h3>
          Calculating NFL moneyline picks...
        </h3>

        <p>
          Comparing passing, rushing, receiving,
          defense, special teams and offensive lines.
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
          ${this.escapeHTML(message)}
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
    if (!this.matchups.length) {
      return 0;
    }

    const total =
      this.matchups.reduce(
        (sum, matchup) =>
          sum +
          this.number(
            matchup.result?.confidence
          ),
        0
      );

    return this.round(
      total / this.matchups.length
    );
  },

  number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
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
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
