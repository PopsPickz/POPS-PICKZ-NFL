/*
=========================================================
POPS PICKZ NFL — COMPACT SCOREBOARD
File: scoreboard.js
=========================================================

Loads NFL games and displays:

- Team logos
- Team abbreviations
- Scores
- Game date and kickoff time
- Live quarter and clock
- Final status
- Automatic refresh every 60 seconds
=========================================================
*/

const NFLScoreboard = {
  refreshInterval: 60 * 1000,
  maximumGames: 16,

  box: null,
  weekLabel: null,
  refreshTimer: null,

  /*
  =======================================================
  START
  =======================================================
  */

  async init() {
    this.box = document.getElementById(
      "scoreboardTrack"
    );

    this.weekLabel = document.getElementById(
      "scoreboardWeek"
    );

    if (!this.box) {
      console.warn(
        "POPS NFL Scoreboard: scoreboardTrack was not found."
      );

      return;
    }

    await this.loadGames();
    this.startRefresh();
  },

  /*
  =======================================================
  LOAD GAMES
  =======================================================
  */

  async loadGames() {
    this.showLoading();

    try {
      const season = this.getNFLSeason();

      const url =
        "https://site.api.espn.com/apis/site/v2/" +
        "sports/football/nfl/scoreboard" +
        `?dates=${season}&limit=1000`;

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `NFL scoreboard request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const events = Array.isArray(data.events)
        ? data.events
        : [];

      const games = events
        .map(event => this.normalizeGame(event))
        .filter(Boolean);

      const selectedGames =
        this.selectRelevantGames(games);

      this.updateWeekLabel(data, selectedGames);
      this.render(selectedGames);
    } catch (error) {
      console.error(
        "POPS NFL scoreboard error:",
        error
      );

      this.showError(error);
    }
  },

  /*
  =======================================================
  CHOOSE RELEVANT GAMES
  =======================================================
  */

  selectRelevantGames(games) {
    const now = Date.now();

    const liveGames = games
      .filter(game => game.state === "in")
      .sort(
        (first, second) =>
          first.startTime - second.startTime
      );

    if (liveGames.length) {
      return liveGames.slice(
        0,
        this.maximumGames
      );
    }

    const todayGames = games
      .filter(game =>
        this.isSameDate(game.startTime, now)
      )
      .sort(
        (first, second) =>
          first.startTime - second.startTime
      );

    if (todayGames.length) {
      return todayGames.slice(
        0,
        this.maximumGames
      );
    }

    const upcomingGames = games
      .filter(game => {
        return (
          game.state === "pre" &&
          game.startTime >= now
        );
      })
      .sort(
        (first, second) =>
          first.startTime - second.startTime
      );

    if (upcomingGames.length) {
      return upcomingGames.slice(
        0,
        this.maximumGames
      );
    }

    return games
      .filter(game => game.state === "post")
      .sort(
        (first, second) =>
          second.startTime - first.startTime
      )
      .slice(0, this.maximumGames);
  },

  /*
  =======================================================
  NORMALIZE GAME
  =======================================================
  */

  normalizeGame(event) {
    const competition =
      event?.competitions?.[0];

    if (!competition) {
      return null;
    }

    const competitors = Array.isArray(
      competition.competitors
    )
      ? competition.competitors
      : [];

    const awayCompetitor =
      competitors.find(
        competitor =>
          competitor.homeAway === "away"
      );

    const homeCompetitor =
      competitors.find(
        competitor =>
          competitor.homeAway === "home"
      );

    if (
      !awayCompetitor ||
      !homeCompetitor
    ) {
      return null;
    }

    const status =
      competition.status ||
      event.status ||
      {};

    const statusType =
      status.type || {};

    const eventDate =
      new Date(event.date);

    return {
      id: event.id || "",

      startTime:
        Number.isNaN(eventDate.getTime())
          ? 0
          : eventDate.getTime(),

      state:
        statusType.state || "pre",

      completed:
        Boolean(statusType.completed),

      statusText:
        statusType.shortDetail ||
        statusType.detail ||
        statusType.description ||
        "Scheduled",

      period:
        Number(status.period) || 0,

      clock:
        status.displayClock || "",

      week:
        event.week?.number ||
        competition.week?.number ||
        "",

      seasonType:
        event.season?.type || "",

      away:
        this.normalizeTeam(
          awayCompetitor
        ),

      home:
        this.normalizeTeam(
          homeCompetitor
        )
    };
  },

  normalizeTeam(competitor) {
    const team =
      competitor.team || {};

    return {
      abbreviation:
        team.abbreviation ||
        team.shortDisplayName ||
        "NFL",

      name:
        team.displayName ||
        team.name ||
        "NFL Team",

      logo:
        team.logo ||
        team.logos?.[0]?.href ||
        "",

      score:
        competitor.score !== undefined
          ? String(competitor.score)
          : "0"
    };
  },

  /*
  =======================================================
  RENDER
  =======================================================
  */

  render(games) {
    if (!games.length) {
      this.box.innerHTML = `
        <div class="scoreboard-message">
          No NFL games are currently available.
        </div>
      `;

      return;
    }

    this.box.innerHTML = games
      .map(game =>
        this.renderGameCard(game)
      )
      .join("");
  },

  renderGameCard(game) {
    return `
      <article class="score-card">

        <div class="game-time">
          ${this.escapeHTML(
            this.getTopStatus(game)
          )}
        </div>

        ${this.renderTeamRow(game.away)}

        ${this.renderTeamRow(game.home)}

        <div class="game-status">
          ${this.escapeHTML(
            this.getBottomStatus(game)
          )}
        </div>

      </article>
    `;
  },

  renderTeamRow(team) {
    return `
      <div class="team-row">

        <div class="team-left">

          ${
            team.logo
              ? `
                <img
                  src="${this.escapeHTML(
                    team.logo
                  )}"
                  alt="${this.escapeHTML(
                    team.name
                  )}"
                  class="team-logo"
                  loading="lazy"
                />
              `
              : `
                <span class="team-logo">
                  🏈
                </span>
              `
          }

          <span class="team-abbr">
            ${this.escapeHTML(
              team.abbreviation
            )}
          </span>

        </div>

        <strong class="team-score">
          ${this.escapeHTML(team.score)}
        </strong>

      </div>
    `;
  },

  /*
  =======================================================
  STATUS TEXT
  =======================================================
  */

  getTopStatus(game) {
    if (game.completed) {
      return "FINAL";
    }

    if (game.state === "in") {
      return "● LIVE";
    }

    return this.formatTime(
      game.startTime
    );
  },

  getBottomStatus(game) {
    if (game.completed) {
      return this.formatDate(
        game.startTime
      );
    }

    if (game.state === "in") {
      const quarter =
        this.formatQuarter(
          game.period
        );

      if (
        quarter &&
        game.clock
      ) {
        return `${quarter} • ${game.clock}`;
      }

      return game.statusText || "LIVE";
    }

    return this.formatDate(
      game.startTime
    );
  },

  formatQuarter(period) {
    if (period === 1) return "1ST";
    if (period === 2) return "2ND";
    if (period === 3) return "3RD";
    if (period === 4) return "4TH";
    if (period > 4) return "OT";

    return "";
  },

  formatTime(timestamp) {
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "TIME TBD";
    }

    return date
      .toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      })
      .toUpperCase();
  },

  formatDate(timestamp) {
    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      [],
      {
        weekday: "short",
        month: "short",
        day: "numeric"
      }
    );
  },

  /*
  =======================================================
  WEEK LABEL
  =======================================================
  */

  updateWeekLabel(data, games) {
    if (!this.weekLabel) {
      return;
    }

    const firstGame =
      games[0];

    const week =
      data?.week?.number ||
      firstGame?.week ||
      "";

    if (week) {
      this.weekLabel.textContent =
        `WEEK ${week}`;

      return;
    }

    if (
      firstGame?.seasonType === 1
    ) {
      this.weekLabel.textContent =
        "PRESEASON";

      return;
    }

    if (
      firstGame?.seasonType === 3
    ) {
      this.weekLabel.textContent =
        "PLAYOFFS";

      return;
    }

    this.weekLabel.textContent =
      "NFL";
  },

  /*
  =======================================================
  REFRESH
  =======================================================
  */

  startRefresh() {
    if (this.refreshTimer) {
      clearInterval(
        this.refreshTimer
      );
    }

    this.refreshTimer =
      setInterval(() => {
        this.loadGames();
      }, this.refreshInterval);
  },

  /*
  =======================================================
  DISPLAY STATES
  =======================================================
  */

  showLoading() {
    this.box.innerHTML = `
      <div class="scoreboard-loading">
        Loading NFL games...
      </div>
    `;
  },

  showError(error) {
    this.box.innerHTML = `
      <div class="scoreboard-message scoreboard-error">

        <strong>
          Scoreboard unavailable
        </strong>

        <span>
          ${this.escapeHTML(
            error?.message ||
            "NFL games could not be loaded."
          )}
        </span>

        <button
          type="button"
          id="scoreboardRetryButton"
        >
          Try Again
        </button>

      </div>
    `;

    const retryButton =
      document.getElementById(
        "scoreboardRetryButton"
      );

    if (retryButton) {
      retryButton.addEventListener(
        "click",
        () => this.loadGames()
      );
    }
  },

  /*
  =======================================================
  HELPERS
  =======================================================
  */

  getNFLSeason() {
    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth();

    return month <= 1
      ? year - 1
      : year;
  },

  isSameDate(
    firstTimestamp,
    secondTimestamp
  ) {
    const first =
      new Date(firstTimestamp);

    const second =
      new Date(secondTimestamp);

    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
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
START SCOREBOARD
=========================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  () => {
    NFLScoreboard.init();
  }
);
