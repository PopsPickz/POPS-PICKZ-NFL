/*
=========================================================
POPS PICKZ NFL — COMPACT SCORE TICKER
File: scoreboard.js
=========================================================
*/

const NFLScoreboard = {
  refreshMilliseconds: 60 * 1000,
  maximumGames: 16,
  track: null,
  weekBox: null,
  timer: null,

  async init() {
    this.track = document.getElementById("scoreboardTrack");
    this.weekBox = document.getElementById("scoreboardWeek");

    if (!this.track) {
      console.warn("scoreboardTrack was not found.");
      return;
    }

    await this.load();

    this.timer = setInterval(() => {
      this.load();
    }, this.refreshMilliseconds);
  },

  async load() {
    this.track.classList.remove("ticker-moving");

    this.track.innerHTML = `
      <div class="ticker-message">
        Loading NFL games...
      </div>
    `;

    try {
      const season = this.getSeason();

      const url =
        "https://site.api.espn.com/apis/site/v2/" +
        "sports/football/nfl/scoreboard" +
        `?dates=${season}&limit=1000`;

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Scoreboard request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const games = (data.events || [])
        .map(event => this.normalizeGame(event))
        .filter(Boolean);

      const selectedGames = this.selectGames(games);

      this.updateWeek(data, selectedGames);
      this.render(selectedGames);
    } catch (error) {
      console.error("NFL scoreboard error:", error);

      this.track.innerHTML = `
        <div class="ticker-message ticker-error">
          Scoreboard unavailable
        </div>
      `;
    }
  },

  selectGames(games) {
    const now = Date.now();

    const live = games
      .filter(game => game.state === "in")
      .sort((a, b) => a.startTime - b.startTime);

    if (live.length) {
      return live.slice(0, this.maximumGames);
    }

    const today = games
      .filter(game =>
        this.sameDate(game.startTime, now)
      )
      .sort((a, b) => a.startTime - b.startTime);

    if (today.length) {
      return today.slice(0, this.maximumGames);
    }

    const upcoming = games
      .filter(game =>
        game.state === "pre" &&
        game.startTime >= now
      )
      .sort((a, b) => a.startTime - b.startTime);

    if (upcoming.length) {
      return upcoming.slice(0, this.maximumGames);
    }

    return games
      .filter(game => game.state === "post")
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, this.maximumGames);
  },

  normalizeGame(event) {
    const competition = event?.competitions?.[0];

    if (!competition) {
      return null;
    }

    const competitors = competition.competitors || [];

    const away = competitors.find(
      team => team.homeAway === "away"
    );

    const home = competitors.find(
      team => team.homeAway === "home"
    );

    if (!away || !home) {
      return null;
    }

    const status =
      competition.status ||
      event.status ||
      {};

    const statusType = status.type || {};
    const startDate = new Date(event.date);

    return {
      startTime: startDate.getTime(),

      state: statusType.state || "pre",

      completed: Boolean(statusType.completed),

      period: Number(status.period) || 0,

      clock: status.displayClock || "",

      statusText:
        statusType.shortDetail ||
        statusType.detail ||
        "Scheduled",

      week:
        event.week?.number ||
        competition.week?.number ||
        "",

      seasonType:
        event.season?.type || 2,

      away: this.normalizeTeam(away),
      home: this.normalizeTeam(home)
    };
  },

  normalizeTeam(competitor) {
    return {
      abbreviation:
        competitor.team?.abbreviation ||
        competitor.team?.shortDisplayName ||
        "NFL",

      score:
        competitor.score !== undefined
          ? String(competitor.score)
          : "0"
    };
  },

  render(games) {
    if (!games.length) {
      this.track.innerHTML = `
        <div class="ticker-message">
          No NFL games available.
        </div>
      `;

      return;
    }

    const cards = games
      .map(game => this.renderCard(game))
      .join("");

    /*
    Duplicate cards to create a smooth loop.
    */

    this.track.innerHTML =
      games.length > 3
        ? cards + cards
        : cards;

    this.track.classList.toggle(
      "ticker-moving",
      games.length > 3
    );
  },

  renderCard(game) {
    return `
      <article class="ticker-game">

        <div class="ticker-status">
          ${
            game.state === "in"
              ? `<span class="ticker-live-dot"></span>`
              : ""
          }

          ${this.escapeHTML(this.getStatus(game))}
        </div>

        <div class="ticker-team-row">
          <strong>
            ${this.escapeHTML(game.away.abbreviation)}
          </strong>

          <span>
            ${this.escapeHTML(game.away.score)}
          </span>
        </div>

        <div class="ticker-team-row">
          <strong>
            ${this.escapeHTML(game.home.abbreviation)}
          </strong>

          <span>
            ${this.escapeHTML(game.home.score)}
          </span>
        </div>

      </article>
    `;
  },

  getStatus(game) {
    if (game.completed) {
      return "FINAL";
    }

    if (game.state === "in") {
      const quarter = this.getQuarter(game.period);

      return game.clock
        ? `${quarter} ${game.clock}`
        : "LIVE";
    }

    const date = new Date(game.startTime);

    return date.toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  },

  getQuarter(period) {
    if (period === 1) return "1ST";
    if (period === 2) return "2ND";
    if (period === 3) return "3RD";
    if (period === 4) return "4TH";
    if (period > 4) return "OT";

    return "";
  },

  updateWeek(data, games) {
    if (!this.weekBox) {
      return;
    }

    const week =
      data?.week?.number ||
      games[0]?.week;

    if (week) {
      this.weekBox.textContent = `WEEK ${week}`;
      return;
    }

    this.weekBox.textContent = "NFL";
  },

  getSeason() {
    const now = new Date();

    return now.getMonth() <= 1
      ? now.getFullYear() - 1
      : now.getFullYear();
  },

  sameDate(firstTimestamp, secondTimestamp) {
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

document.addEventListener("DOMContentLoaded", () => {
  NFLScoreboard.init();
});
