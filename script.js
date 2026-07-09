document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('nav.links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  loadUpdates();
  injectMobilePetitionBar();
  openConcernFromHash();
});

var PETITION_URL = 'https://www.change.org/p/graylands-forensic-campus-expansion';

/* Small always-visible mobile CTA — the header nav-petition button is hidden
   inside the hamburger menu on small screens, and most petition traffic
   arrives on mobile (WhatsApp), so it needs its own persistent entry point. */
function injectMobilePetitionBar() {
  if (document.querySelector('.mobile-petition-bar')) return;
  var bar = document.createElement('div');
  bar.className = 'mobile-petition-bar';
  bar.innerHTML = '<a href="' + PETITION_URL + '" target="_blank" rel="noopener">Sign the petition</a>';
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

  fetch('updates.json')
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
  return (
    '<div class="update-entry">' +
      '<div class="update-head">' +
        '<span class="update-tag ' + tagClass + '">' + escapeHtml(tagLabel) + '</span>' +
        '<span class="update-date">' + escapeHtml(dateLabel) + '</span>' +
      '</div>' +
      '<h4>' + escapeHtml(item.title || '') + '</h4>' +
      '<p class="body-text">' + escapeHtml(item.body || '') + '</p>' +
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
