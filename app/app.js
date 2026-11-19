/* GTA VI Trophy Guide — tracker logic.
   Loads app/data/trophies.json (a local file), renders the checklist, the
   detail panel and the roadmap, and saves progress in localStorage.
   No network requests beyond the local data file. */

(function () {
  "use strict";

  var STORAGE_KEY = "gta6-trophy-guide-progress-v1";
  var DATA_URL = "data/trophies.json";

  var params = new URLSearchParams(window.location.search);
  var shot = params.get("shot") || "";

  var trophies = [];
  var meta = null;
  var earned = new Set();
  var demoEarned = null; // ?shot=tracker shows a fixed demo state, never saved
  var filterKind = "all";
  var searchText = "";
  var spoilerOn = false;
  var selectedId = 28; // Positive Mental Attitude: the missable one, a good first guide
  var view = "list";

  var listEl = document.getElementById("trophyList");
  var countEl = document.getElementById("countLine");
  var emptyEl = document.getElementById("emptyState");
  var detailEl = document.getElementById("detail");
  var progressFill = document.getElementById("progressFill");
  var progressText = document.getElementById("progressText");
  var searchInput = document.getElementById("search");
  var spoilerInput = document.getElementById("spoilerToggle");
  var stagesEl = document.getElementById("stages");

  var STAGES = [
    { n: 1, title: "Play the story", blurb: "Chapters 1 to 4, the final mission, the story missions and the character strands. Do these first — there is no mission replay, so keep a manual save at the start of every chapter and one before the final mission." },
    { n: 2, title: "Activities and side content", blurb: "Stunts, the shooting range, races, fishing, arcade games, drone races, bowling, challenges, Combat Focus and the Scooter Bros app. Most of these open up once both Jason and Lucia are playable in Chapter 2." },
    { n: 3, title: "Collectibles and exploration", blurb: "Card sets, WAiNK spots, vehicles, garage properties and the whole map. Start early and tick them off as you explore — they are the long grind." },
    { n: 4, title: "Money and crime", blurb: "Bank vaults, armored trucks, shops, jewelry stores, gang operations and laundering Marked Bills. Plan each job with a getaway route." },
    { n: 5, title: "Cleanup and the Platinum", blurb: "Finish 100% completion, then the Platinum pops. Leave this for last — it is the final check on everything above." }
  ];

  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(function (id) { earned.add(id); });
    } catch (e) { /* a bad saved value is ignored; progress starts empty */ }
  }

  function saveProgress() {
    if (demoEarned) return; // the tracker screenshot state is never saved
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(earned).sort(function (a, b) { return a - b; })));
    } catch (e) { /* storage full or blocked; the page still works */ }
  }

  function isEarned(id) {
    return demoEarned ? demoEarned.has(id) : earned.has(id);
  }

  function earnedCount() {
    var n = 0;
    trophies.forEach(function (t) { if (isEarned(t.id)) n++; });
    return n;
  }

  function gradeLabel(g) {
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function matches(t) {
    if (filterKind !== "all" && t.kinds.indexOf(filterKind) === -1) return false;
    if (searchText) {
      var hay = (t.name + " " + t.description + " " + t.guide).toLowerCase();
      if (hay.indexOf(searchText) === -1) return false;
    }
    return true;
  }

  function renderProgress() {
    var n = earnedCount();
    var total = trophies.length || 55;
    progressFill.style.width = Math.round((n / total) * 100) + "%";
    progressText.textContent = n + " of " + total + " earned" + (n === total ? " — Platinum ready!" : "");
  }

  function renderList() {
    var shown = trophies.filter(matches);
    countEl.textContent = shown.length + " of " + trophies.length + " trophies" +
      (filterKind !== "all" ? " · " + filterKind : "") +
      (searchText ? " · matching “" + searchText + "”" : "");
    emptyEl.hidden = shown.length !== 0;

    var html = "";
    shown.forEach(function (t) {
      var got = isEarned(t.id);
      var hiddenNow = spoilerOn && t.hidden && !got;
      var name = hiddenNow ? "Hidden trophy" : esc(t.name);
      var desc = hiddenNow ? "Story trophy — hidden until earned. Tick it off when it pops to reveal it." : esc(t.description);
      var tags = "";
      if (t.count !== null && t.count !== undefined) tags += '<span class="tag count">' + esc(String(t.count)) + "×</span>";
      if (t.missable) tags += '<span class="tag missable">Missable</span>';
      if (t.hidden) tags += '<span class="tag hidden-t">Hidden</span>';
      if (t.kinds.indexOf("collectibles") !== -1) tags += '<span class="tag">Collectible</span>';
      html += '<li><button type="button" class="trophy' + (got ? " earned" : "") + (t.id === selectedId ? " selected" : "") + '" data-id="' + t.id + '">' +
        '<input type="checkbox" tabindex="-1" aria-label="Mark ' + esc(t.name) + ' as earned"' + (got ? " checked" : "") + '>' +
        '<span class="trophy-body"><span class="trophy-name">' + name + '</span>' +
        '<span class="trophy-desc' + (hiddenNow ? " spoiled" : "") + '">' + desc + "</span>" +
        (tags ? '<span class="trophy-tags">' + tags + "</span>" : "") +
        "</span>" +
        '<span class="grade-badge grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + "</span>" +
        "</button></li>";
    });
    listEl.innerHTML = html;
  }

  function renderDetail() {
    var t = null;
    trophies.forEach(function (x) { if (x.id === selectedId) t = x; });
    if (!t) {
      detailEl.innerHTML = '<p class="detail-empty">Pick a trophy from the list to read its guide, sources and missable warning.</p>';
      return;
    }
    var got = isEarned(t.id);
    var hiddenNow = spoilerOn && t.hidden && !got;
    var stage = STAGES[t.stage - 1];
    var html = "";
    html += "<h2>" + (hiddenNow ? "Hidden trophy" : esc(t.name)) + "</h2>";
    html += '<p class="official"><strong>' + esc(gradeLabel(t.grade)) + "</strong> · " +
      (hiddenNow ? "Story trophy — hidden until earned." : esc(t.description)) + "</p>";
    if (t.missable && !hiddenNow) {
      html += '<p class="warn">Missable — GTA VI has no mission replay. ' +
        (t.id === 28
          ? "Lucia's balcony meditation in Chapter 1 counts toward this trophy and disappears after that chapter. Meditate there during Chapter 1."
          : "Keep a manual save at the start of the chapter and one before the final mission.") + "</p>";
    }
    if (hiddenNow) {
      html += "<h3>Guide</h3><p class=\"guide\">This is a story trophy, so its guide is hidden while spoiler-safe mode is on. Earn it in the game, tick it off here, and the guide appears.</p>";
    } else {
      html += "<h3>How to get it</h3><p class=\"guide\">" + esc(t.guide) + "</p>";
      if (t.count !== null && t.count !== undefined) {
        html += "<h3>Target</h3><p class=\"guide\">" + esc(String(t.count)) + (t.id === 52 || t.id === 53 ? " dollars" : " in total") + ".</p>";
      }
      html += "<h3>Sources</h3><ul class=\"sources\">";
      t.sources.forEach(function (s) {
        html += '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a></li>";
      });
      html += "</ul>";
    }
    html += '<div class="meta">';
    if (t.missable) html += '<span class="tag missable">Missable</span>';
    if (t.hidden) html += '<span class="tag hidden-t">Hidden on PlayStation</span>';
    t.kinds.forEach(function (k) { html += '<span class="tag">' + esc(k) + "</span>"; });
    if (stage) html += '<span class="tag">Roadmap stage ' + stage.n + ": " + esc(stage.title) + "</span>";
    html += "</div>";
    if (got) html += '<p class="earned-note">Earned — nice work.</p>';
    detailEl.innerHTML = html;
  }

  function renderRoadmap() {
    var html = "";
    STAGES.forEach(function (st) {
      var items = trophies.filter(function (t) { return t.stage === st.n; });
      var done = items.filter(function (t) { return isEarned(t.id); }).length;
      html += '<li class="stage"><h3><span class="stage-num">' + st.n + "</span>" + esc(st.title) +
        ' <span style="color:var(--faint);font-weight:600;font-size:13px">' + done + " / " + items.length + " earned</span></h3>" +
        "<p>" + esc(st.blurb) + "</p><ul>";
      items.forEach(function (t) {
        var got = isEarned(t.id);
        var hiddenNow = spoilerOn && t.hidden && !got;
        html += '<li class="' + (got ? "done" : "") + '">' + (got ? "✓ " : "") +
          (hiddenNow ? "Hidden trophy" : esc(t.name)) +
          (t.missable ? ' <span class="tag missable">Missable</span>' : "") + "</li>";
      });
      html += "</ul></li>";
    });
    stagesEl.innerHTML = html;
  }

  function render() {
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
  }

  function setView(v) {
    view = v;
    var listBtn = document.getElementById("viewList");
    var roadBtn = document.getElementById("viewRoadmap");
    listBtn.classList.toggle("active", v === "list");
    roadBtn.classList.toggle("active", v === "roadmap");
    listBtn.setAttribute("aria-pressed", v === "list" ? "true" : "false");
    roadBtn.setAttribute("aria-pressed", v === "roadmap" ? "true" : "false");
    document.querySelector(".layout").hidden = v !== "list";
    document.getElementById("roadmap").hidden = v !== "roadmap";
  }

  function exportProgress() {
    var data = {
      app: "gta6-trophy-guide",
      exported_at: new Date().toISOString(),
      earned: Array.from(earned).sort(function (a, b) { return a - b; })
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gta6-trophy-progress.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importProgress(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var ids = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(ids)) throw new Error("not a progress file");
        var valid = new Set(trophies.map(function (t) { return t.id; }));
        earned = new Set(ids.filter(function (id) { return valid.has(id); }));
        saveProgress();
        render();
      } catch (e) {
        alert("That file is not a trophy progress export from this guide.");
      }
    };
    reader.readAsText(file);
  }

  // Events
  listEl.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".trophy");
    if (!btn) return;
    var id = Number(btn.getAttribute("data-id"));
    if (ev.target && ev.target.tagName === "INPUT") {
      if (isEarned(id)) { earned.delete(id); if (demoEarned) demoEarned.delete(id); }
      else { earned.add(id); if (demoEarned) demoEarned.add(id); }
      saveProgress();
      render();
      return;
    }
    selectedId = id;
    renderList();
    renderDetail();
  });

  document.getElementById("filters").addEventListener("click", function (ev) {
    var btn = ev.target.closest(".filter-btn");
    if (!btn) return;
    filterKind = btn.getAttribute("data-kind");
    document.querySelectorAll(".filter-btn").forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    renderList();
  });

  searchInput.addEventListener("input", function () {
    searchText = searchInput.value.trim().toLowerCase();
    renderList();
  });

  spoilerInput.addEventListener("change", function () {
    spoilerOn = spoilerInput.checked;
    renderList();
    renderDetail();
    renderRoadmap();
  });

  document.getElementById("viewList").addEventListener("click", function () { setView("list"); });
  document.getElementById("viewRoadmap").addEventListener("click", function () { setView("roadmap"); });
  document.getElementById("exportBtn").addEventListener("click", exportProgress);
  document.getElementById("importBtn").addEventListener("click", function () {
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", function (ev) {
    importProgress(ev.target.files && ev.target.files[0]);
    ev.target.value = "";
  });
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (window.confirm("Clear all earned trophies? This cannot be undone — export a backup first if you want one.")) {
      earned = new Set();
      if (demoEarned) demoEarned = new Set();
      saveProgress();
      render();
    }
  });

  // Screenshot states (?shot= and ?trophy=)
  function applyShot() {
    var trophyParam = Number(params.get("trophy") || "");
    if (trophyParam >= 1 && trophyParam <= 55) selectedId = trophyParam;
    if (shot === "roadmap") { setView("roadmap"); return; }
    if (shot === "tracker") {
      filterKind = "missable";
      spoilerOn = true;
      spoilerInput.checked = true;
      document.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-kind") === "missable");
      });
      demoEarned = new Set([2, 3, 8, 21, 28, 35, 42, 46, 51, 55, 15, 32]);
      selectedId = 28;
      return;
    }
    if (shot === "detail" || shot === "cover") { if (!trophyParam) selectedId = 28; return; }
  }

  // Boot
  loadProgress();
  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("could not load " + DATA_URL);
      return res.json();
    })
    .then(function (data) {
      meta = data;
      trophies = data.trophies || [];
      applyShot();
      setView(view);
      render();
    })
    .catch(function (err) {
      listEl.innerHTML = '<li class="empty">The trophy data could not be loaded (' + esc(err.message) + '). Open this guide through a web server — for example, run <code>node serve.ts</code> and visit http://localhost:8080.</li>';
      countEl.textContent = "";
    });
})();
