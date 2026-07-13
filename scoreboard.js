/*
=========================================================
POPS PICKZ NFL — LIVE SCOREBOARD
File: scoreboard.js
=========================================================

Displays:

- Live NFL games first
- Today's scheduled games
- Next upcoming NFL games when none are live
- Recent final scores as a fallback
- Automatic refresh every 60 seconds
=========================================================
*/

const NFLScoreboard = {
  refreshInterval: 60 * 1000,
  maximumGames: 10,

  box: null,
  weekLabel: null,
  refreshTimer: null,

  /*
  =======================================================
  START SCOREBOARD
  =======================================================
  */

  async init() {
    this.box = document.getElementById("scoreboardTrack");

    this.weekLabel = document.getElementById(
      "scoreboardWeek"
    );

    if (!this.box) {
      console.warn(
        "POPS NFL Scoreboard: scoreboardTrack was not found."
      );

      return;
    }

    await this.load();

    this.startAutomaticRefresh();
  },

  /*
  =======================================================
  LOAD NFL GAMES
  =======================================================
  */

  async load() {
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

      const selectedGames = this.selectGames(events);

      this.updateWeekLabel(data, selectedGames);
      this.render(selectedGames);
    } catch (error) {
      console.error(
        "POPS NFL Scoreboard loading error:",
        error
      );

      this.showError(error);
    }
  },

  /*
  =======================================================
  CHOOSE THE MOST RELEVANT GAMES
  =======================================================
  */

  selectGames(events) {
    const normalizedGames = events
      .map(event => this.normalizeGame(event))
      .filter(Boolean);

    const liveGames = normalizedGames.filter(
      game => game.state === "in"
    );

    if (liveGames.length) {
      return liveGames
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, this.maximumGames);
    }

    const now = Date.now();

    const todaysGames = normalizedGames.filter(game =>
      this.isSameLocalDate(game.startTime, now)
    );

    if (todaysGames.length) {
      return todaysGames
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, this.maximumGames);
    }

    const upcomingGames = normalizedGames
      .filter(game => {
        return (
          game.state === "pre" &&
          game.startTime >= now
        );
      })
      .sort((a, b) => a.startTime - b.startTime);

    if (upcomingGames.length) {
      return upcomingGames.slice(
        0,
        this.maximumGames
      );
    }

    return normalizedGames
      .filter(game => game.state === "post")
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, this.maximumGames);
  },

  /*
  =======================================================
  NORMALIZE ESPN GAME DATA
  =======================================================
  */

  normalizeGame(event) {
    const competition = event?.competitions?.[0];

    if (!competition) {
      return null;
    }

    const competitors = Array.isArray(
      competition.competitors
    )
      ? competition.competitors
      : [];

    const home = competitors.find(
      competitor => competitor.homeAway === "home"
    );

    const away = competitors.find(
      competitor => competitor.homeAway === "away"
    );

    if (!home || !away) {
      return null;
    }

    const statusType =
      competition.status?.type ||
      event.status?.type ||
      {};

    return {
      id: event.id || "",

      name: event.name || "",

      startTime: new Date(event.date).getTime(),

      state: statusType.state || "pre",

      completed: Boolean(statusType.completed),

      statusText:
        statusType.shortDetail ||
        statusType.detail ||
        statusType.description ||
        "Scheduled",

      period:
        Number(
          competition.status?.period ||
          event.status?.period
        ) || 0,

      clock:
        competition.status?.displayClock ||
        event.status?.displayClock ||
        "",

      week:
        event.week?.number ||
        competition.week?.number ||
        "",

      seasonType:
        event.season?.type ||
        competition.type?.abbreviation ||
        "",

      home: this.normalizeTeam(home),

      away: this.normalizeTeam(away)
    };
  },

  normalizeTeam(competitor) {
    const team = competitor.team || {};

    return {
      id: team.id || "",

      abbreviation:
        team.abbreviation ||
        team.shortDisplayName ||
        "NFL",

      name:
        team.displayName ||
        team.name ||
        "NFL Team",

      shortName:
        team.shortDisplayName ||
        team.abbreviation ||
        team.name ||
        "NFL",

      logo:
        team.logo ||
        team.logos?.[0]?.href ||
        "",

      score:
        competitor.score !== undefined
          ? String(competitor.score)
          : "0",

      winner: Boolean(competitor.winner)
    };
  },

  /*
  =======================================================
  RENDER SCOREBOARD
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

    const gameCards = games
      .map(game => this.renderGameCard(game))
      .join("");

    /*
    Duplicate the cards when multiple games exist.
    This creates a seamless continuous scrolling loop.
    */

    const duplicatedCards =
      games.length > 2
        ? gameCards + gameCards
        : gameCards;

    this.box.innerHTML = duplicatedCards;

    this.box.classList.toggle(
      "scoreboard-animate",
      games.length > 2
    );
  },

  renderGameCard(game) {
    const gameStatus = this.getGameStatus(game);

    const liveClass =
      game.state === "in"
        ? " score-card-live"
        : "";

    const finalClass =
      game.completed
        ? " score-card-final"
        : "";

    return `
      <article
        class="score-card${liveClass}${finalClass}"
        data-game-id="${this.escapeHTML(game.id)}"
      >
        <div class="score-card-status">
          ${game.state === "in"
            ? `<span class="score-live-dot"></span>`
            : ""
          }

          <span>
            ${this.escapeHTML(gameStatus)}
          </span>
        </div>

        ${this.renderTeamRow(game.away)}

        ${this.renderTeamRow(game.home)}

        <div class="score-card-footer">
          ${this.escapeHTML(
            this.formatGameDate(game.startTime)
          )}
        </div>
      </article>
    `;
  },

  renderTeamRow(team) {
    return `
      <div class="score-team-row">
        <div class="score-team-identity">
          ${
            team.logo
              ? `
                <img
                  src="${this.escapeHTML(team.logo)}"
                  alt="${this.escapeHTML(team.name)}"
                  class="score-team-logo"
                  loading="lazy"
                />
              `
              : `
                <span class="score-team-fallback">
                  🏈
                </span>
              `
          }

          <span class="score-team-name">
            ${this.escapeHTML(team.abbreviation)}
          </span>
        </div>

        <strong class="score-team-score">
          ${this.escapeHTML(team.score)}
        </strong>
      </div>
    `;
  },

  /*
  =======================================================
  GAME STATUS
  =======================================================
  */

  getGameStatus(game) {
    if (game.completed) {
      return "FINAL";
    }

    if (game.state === "in") {
      const quarter = this.formatQuarter(game.period);

      if (quarter && game.clock) {
        return `${quarter} • ${game.clock}`;
      }

      return game.statusText || "LIVE";
    }

    return this.formatGameTime(game.startTime);
  },

  formatQuarter(period) {
    if (period === 1) return "1ST";
    if (period === 2) return "2ND";
    if (period === 3) return "3RD";
    if (period === 4) return "4TH";
    if (period > 4) return "OT";

    return "";
  },

  formatGameTime(timestamp) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "TIME TBD";
    }

    return date
      .toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      })
      .toUpperCase();
  },

  formatGameDate(timestamp) {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  },

  /*
  =======================================================
  SCOREBOARD LABEL
  =======================================================
  */

  updateWeekLabel(data, games) {
    if (!this.weekLabel) {
      return;
    }

    const firstGame = games[0];

    const apiWeek =
      data?.week?.number ||
      firstGame?.week ||
      "";

    if (apiWeek) {
      this.weekLabel.textContent =
        `WEEK ${apiWeek}`;

      return;
    }

    const seasonType =
      firstGame?.seasonType;

    if (seasonType === 1) {
      this.weekLabel.textContent = "PRESEASON";
      return;
    }

    if (seasonType === 3) {
      this.weekLabel.textContent = "PLAYOFFS";
      return;
    }

    this.weekLabel.textContent = "NFL";
  },

  /*
  =======================================================
  AUTOMATIC REFRESH
  =======================================================
  */

  startAutomaticRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.load();
    }, this.refreshInterval);
  },

  /*
  =======================================================
  DISPLAY STATES
  =======================================================
  */

  showLoading() {
    this.box.classList.remove(
      "scoreboard-animate"
    );

    this.box.innerHTML = `
      <div class="scoreboard-loading">
        Loading NFL games...
      </div>
    `;
  },

  showError(error) {
    this.box.classList.remove(
      "scoreboard-animate"
    );

    this.box.innerHTML = `
      <div class="scoreboard-message scoreboard-error">
        <strong>Scoreboard unavailable</strong>

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
        () => this.load()
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
    const year = now.getFullYear();
    const month = now.getMonth();

    /*
    January and February belong to the NFL season
    that began during the previous calendar year.
    */

    return month <= 1
      ? year - 1
      : year;
  },

  isSameLocalDate(firstTimestamp, secondTimestamp) {
    const first = new Date(firstTimestamp);
    const second = new Date(secondTimestamp);

    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
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
