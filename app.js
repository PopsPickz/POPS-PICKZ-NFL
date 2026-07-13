/*
=========================================================
POPS PICKZ NFL
File: app.js

Purpose:
- Controls the main navigation tabs
- Controls the Season Leaders QB / RB / WR-TE tabs
- Scrolls the selected section into view
=========================================================
*/

document.addEventListener("DOMContentLoaded", () => {
  setupMainTabs();
  setupLeaderTabs();
});

/*
=========================================================
MAIN NAVIGATION TABS
=========================================================
*/

function setupMainTabs() {
  const buttons = document.querySelectorAll(".main-tab");
  const sections = document.querySelectorAll(".tab-section");

  if (!buttons.length || !sections.length) {
    console.warn("POPS NFL: Main tabs or sections were not found.");
    return;
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.tab;
      const targetSection = document.getElementById(targetId);

      if (!targetSection) {
        console.warn(
          `POPS NFL: Section "${targetId}" was not found.`
        );
        return;
      }

      buttons.forEach(item => {
        item.classList.remove("active-tab");
      });

      sections.forEach(section => {
        section.classList.remove("active-section");
      });

      button.classList.add("active-tab");
      targetSection.classList.add("active-section");

      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

/*
=========================================================
SEASON LEADERS SAMPLE DATA
=========================================================
*/

const seasonLeaderData = {
  qb: {
    title: "QB Leaders",
    columns: ["Rank", "Player", "Team", "Pass Yards", "Pass TD"],
    players: [
      {
        rank: 1,
        name: "Josh Allen",
        team: "BUF",
        yards: "1,842",
        touchdowns: "13"
      },
      {
        rank: 2,
        name: "Patrick Mahomes",
        team: "KC",
        yards: "1,726",
        touchdowns: "11"
      },
      {
        rank: 3,
        name: "Jalen Hurts",
        team: "PHI",
        yards: "1,624",
        touchdowns: "10"
      },
      {
        rank: 4,
        name: "Lamar Jackson",
        team: "BAL",
        yards: "1,489",
        touchdowns: "9"
      },
      {
        rank: 5,
        name: "Joe Burrow",
        team: "CIN",
        yards: "1,442",
        touchdowns: "11"
      }
    ]
  },

  rb: {
    title: "RB Leaders",
    columns: ["Rank", "Player", "Team", "Rush Yards", "Rush TD"],
    players: [
      {
        rank: 1,
        name: "Jahmyr Gibbs",
        team: "DET",
        yards: "812",
        touchdowns: "8"
      },
      {
        rank: 2,
        name: "Saquon Barkley",
        team: "PHI",
        yards: "784",
        touchdowns: "7"
      },
      {
        rank: 3,
        name: "Derrick Henry",
        team: "BAL",
        yards: "742",
        touchdowns: "9"
      },
      {
        rank: 4,
        name: "Christian McCaffrey",
        team: "SF",
        yards: "698",
        touchdowns: "6"
      },
      {
        rank: 5,
        name: "Breece Hall",
        team: "NYJ",
        yards: "651",
        touchdowns: "5"
      }
    ]
  },

  wr: {
    title: "WR / TE Leaders",
    columns: ["Rank", "Player", "Team", "Rec Yards", "Rec TD"],
    players: [
      {
        rank: 1,
        name: "Justin Jefferson",
        team: "MIN",
        yards: "886",
        touchdowns: "7"
      },
      {
        rank: 2,
        name: "Tyreek Hill",
        team: "MIA",
        yards: "842",
        touchdowns: "6"
      },
      {
        rank: 3,
        name: "A.J. Brown",
        team: "PHI",
        yards: "798",
        touchdowns: "7"
      },
      {
        rank: 4,
        name: "CeeDee Lamb",
        team: "DAL",
        yards: "761",
        touchdowns: "5"
      },
      {
        rank: 5,
        name: "Travis Kelce",
        team: "KC",
        yards: "632",
        touchdowns: "5"
      }
    ]
  }
};

/*
=========================================================
SEASON LEADERS SUB-TABS
=========================================================
*/

function setupLeaderTabs() {
  const buttons = document.querySelectorAll(".sub-tab");

  if (!buttons.length) {
    console.warn("POPS NFL: Season leader tabs were not found.");
    return;
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.leaderTab;

      buttons.forEach(item => {
        item.classList.remove("active-sub-tab");
      });

      button.classList.add("active-sub-tab");
      renderSeasonLeaders(category);
    });
  });

  renderSeasonLeaders("qb");
}

/*
=========================================================
RENDER SEASON LEADERS
=========================================================
*/

function renderSeasonLeaders(category) {
  const box = document.getElementById("seasonLeadersBox");
  const data = seasonLeaderData[category];

  if (!box || !data) {
    return;
  }

  box.innerHTML = `
    <div class="leaders-table-head">
      ${data.columns
        .map(column => `<span>${escapeHTML(column)}</span>`)
        .join("")}
    </div>

    ${data.players
      .map(
        player => `
          <div class="leaders-table-row">
            <span>${player.rank}</span>
            <strong>${escapeHTML(player.name)}</strong>
            <span>${escapeHTML(player.team)}</span>
            <span>${escapeHTML(player.yards)}</span>
            <span>${escapeHTML(player.touchdowns)}</span>
          </div>
        `
      )
      .join("")}
  `;
}

/*
=========================================================
HELPER
=========================================================
*/

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
