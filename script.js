document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('nav.links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  initNavDropdowns();
  loadUpdates();
  loadQons();
  injectMobilePetitionBar();
  openConcernFromHash();
});

/* Evidence nav dropdown — click/tap to toggle (not hover-only, so it works on
   touch); closes when another dropdown opens, an outside click happens, or Escape
   is pressed. No-op on any page that doesn't have a .nav-dropdown yet. */
function initNavDropdowns() {
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  if (!dropdowns.length) return;

  dropdowns.forEach(function (dropdown) {
    var toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = dropdown.classList.contains('open');
      dropdowns.forEach(function (d) {
        d.classList.remove('open');
        var t = d.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        dropdown.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', function () {
    dropdowns.forEach(function (d) {
      d.classList.remove('open');
      var t = d.querySelector('.nav-dropdown-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      dropdowns.forEach(function (d) {
        d.classList.remove('open');
        var t = d.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

var PETITION_URL = 'https://www.change.org/p/pause-the-698m-graylands-forensic-campus-expansion-show-us-why-this-makes-sense';

/* Small always-visible mobile CTA — the header nav-petition button is hidden
   inside the hamburger menu on small screens, and most petition traffic
   arrives on mobile (WhatsApp), so it needs its own persistent entry point. */
function injectMobilePetitionBar() {
  if (document.querySelector('.mobile-petition-bar')) return;
  var bar = document.createElement('div');
  bar.className = 'mobile-petition-bar';
  bar.innerHTML =
    '<a class="mpb-primary" href="' + PETITION_URL + '" target="_blank" rel="noopener">Sign the petition</a>' +
    '<a class="mpb-register" href="join-us.html#register">+ Register support</a>';
  document.body.appendChild(bar);
}

/* If arriving at concerns.html#concern-3 (e.g. from the homepage teaser grid),
   open that specific card automatically instead of leaving it collapsed. */
function openConcernFromHash() {
  var hash = window.location.hash;
  if (!hash) return;
  var target = document.querySelector(hash);
  if (target && target.tagName === 'DETAILS') {
    target.open = true;
    setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  }
}

/* ---------- Latest updates feed ----------
   Reads updates.json at runtime, so posting a new update is a one-file edit
   (add an entry to updates.json, push) — no HTML/page rebuild needed.
   Renders into #update-feed (full list, updates.html) and/or
   #update-preview (top 2, homepage) — whichever is present on the page. */

var UPDATE_TAG_LABELS = {
  sent: 'Sent',
  reply: 'Reply received',
  milestone: 'Milestone',
  media: 'Media'
};

function loadUpdates() {
  var feedEl = document.getElementById('update-feed');
  var previewEl = document.getElementById('update-preview');
  if (!feedEl && !previewEl) return;

  fetch('updates.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('updates.json returned ' + res.status);
      return res.json();
    })
    .then(function (items) {
      items = items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });

      if (feedEl) {
        if (!items.length) {
          feedEl.innerHTML = '<p class="update-empty">No updates yet — check back soon.</p>';
        } else {
          feedEl.innerHTML = items.map(renderUpdateEntry).join('');
        }
      }
      if (previewEl) {
        var top = items.slice(0, 2);
        previewEl.innerHTML = top.map(renderUpdateEntry).join('');
      }
    })
    .catch(function (err) {
      var msg = '<p class="update-empty">Updates couldn\'t be loaded right now.</p>';
      if (feedEl) feedEl.innerHTML = msg;
      if (previewEl) previewEl.innerHTML = msg;
      console.error('Failed to load updates.json:', err);
    });
}

function renderUpdateEntry(item) {
  var tagClass = 'tag-' + (item.tag || 'milestone');
  var tagLabel = UPDATE_TAG_LABELS[item.tag] || 'Update';
  var dateLabel = formatUpdateDate(item.date);
  var linkHtml = '';
  if (item.link) {
    var isExternal = /^https?:\/\//i.test(item.link);
    var targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';
    linkHtml = '<p><a class="cite" href="' + escapeHtml(item.link) + '"' + targetAttr + '>' +
      escapeHtml(item.linkText || 'Read the source') + '</a></p>';
  }
  return (
    '<div class="update-entry">' +
      '<div class="update-head">' +
        '<span class="update-tag ' + tagClass + '">' + escapeHtml(tagLabel) + '</span>' +
        '<span class="update-date">' + escapeHtml(dateLabel) + '</span>' +
      '</div>' +
      '<h4>' + escapeHtml(item.title || '') + '</h4>' +
      '<p class="body-text">' + escapeHtml(item.body || '') + '</p>' +
      linkHtml +
    '</div>'
  );
}

/* ---------- Questions on Notice tracker ----------
   Reads qons.json at runtime, same pattern as updates.json above.
   Renders into #qon-feed (table body) and #qon-stats (summary counts),
   whichever is present on the page. Adding a new question, or an answer
   to an existing one, is a one-file edit to qons.json — no HTML change needed. */

const PARLIAMENT_QON_BASE = 'https://www.parliament.wa.gov.au/parliament/pquest.nsf/viewLAPQuestByDate/';

function loadQons() {
  var bodyEl = document.getElementById('qon-feed');
  var statsEl = document.getElementById('qon-stats');
  if (!bodyEl && !statsEl) return;

  fetch('qons.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('qons.json returned ' + res.status);
      return res.json();
    })
    .then(function (items) {
      items = items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });

      if (statsEl) {
        var total = items.length;
        var pending = items.filter(function (i) { return i.status === 'pending'; }).length;
        var members = [...new Set(items.map(function (i) { return i.member; }))].filter(function(m){ return m.indexOf('pending') === -1; }).length;
        statsEl.innerHTML =
          '<div class="stat-card"><span class="num">' + total + '</span><span class="label">Questions tracked</span></div>' +
          '<div class="stat-card"><span class="num">' + pending + '</span><span class="label">Currently unanswered</span></div>' +
          '<div class="stat-card"><span class="num">' + (total - pending) + '</span><span class="label">Answered</span></div>' +
          '<div class="stat-card"><span class="num">' + members + '</span><span class="label">MPs who have asked</span></div>';
      }

      if (bodyEl) {
        if (!items.length) {
          bodyEl.innerHTML = '<p class="update-empty">No questions tracked yet — check back soon.</p>';
        } else {
          bodyEl.innerHTML = items.map(renderQonEntry).join('');
        }
      }
    })
    .catch(function (err) {
      var msg = '<p class="update-empty">The tracker couldn\'t be loaded right now.</p>';
      if (bodyEl) bodyEl.innerHTML = msg;
      console.error('Failed to load qons.json:', err);
    });
}

function renderQonEntry(item) {
  var statusClass = item.status === 'pending' ? 'tag-sent' : 'tag-reply';
  var statusLabel = item.status === 'pending' ? 'Awaiting answer' : ('Answered ' + formatUpdateDate(item.answered_date));
  var url = item.docId ? (PARLIAMENT_QON_BASE + item.docId + '?opendocument') : item.sourceUrl;
  var linkLabel = item.docId ? 'View on parliament.wa.gov.au' : 'View source Hansard record';
  var answerHtml = item.answer_summary
    ? '<p class="body-text"><strong>Answer:</strong> ' + escapeHtml(item.answer_summary) + '</p>'
    : '';
  var linkHtml = url ? ('<p><a class="cite" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + linkLabel + '</a></p>') : '';
  return (
    '<div class="update-entry">' +
      '<div class="update-head">' +
        '<span class="update-tag ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
        '<span class="update-date">' + escapeHtml(formatUpdateDate(item.date)) + '</span>' +
      '</div>' +
      '<h4>' + escapeHtml(item.qnum) + ' \u2014 ' + escapeHtml(item.topic) + '</h4>' +
      '<p class="body-text" style="font-size:0.85rem;color:var(--slate);">Asked by ' + escapeHtml(item.member) + ' \u00b7 ' + escapeHtml(item.portfolio) + '</p>' +
      '<p class="body-text">' + escapeHtml(item.question) + '</p>' +
      answerHtml +
      linkHtml +
    '</div>'
  );
}

function formatUpdateDate(iso) {
  if (!iso) return '';
  var d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
