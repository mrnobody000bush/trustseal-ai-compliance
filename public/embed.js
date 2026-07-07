(function () {
  var script = document.currentScript;
  if (!script) return;
  var siteId = script.getAttribute("data-trustseal");
  if (!siteId) return;
  var base = new URL(script.src).origin;

  fetch(base + "/api/public/widget/" + encodeURIComponent(siteId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var cfg = data.widget_config || {};
      var accent = cfg.accent || "#4F46E5";
      var position = cfg.position || "bottom-right";
      var theme = cfg.theme || "light";
      var score = data.score != null ? data.score : "—";

      var host = document.createElement("div");
      host.style.cssText =
        "position:fixed;z-index:2147483647;" +
        (position.indexOf("bottom") === 0 ? "bottom:20px;" : "top:20px;") +
        (position.indexOf("right") > -1 ? "right:20px;" : "left:20px;");
      document.body.appendChild(host);
      var root = host.attachShadow({ mode: "open" });

      var bg = theme === "dark" ? "#1a1a1d" : "#ffffff";
      var fg = theme === "dark" ? "#f5f5f7" : "#0a0a0b";
      var border = theme === "dark" ? "#2a2a2d" : "#e5e7eb";
      var muted = theme === "dark" ? "#9ca3af" : "#6b7280";

      root.innerHTML =
        "<style>" +
        ".ts-badge{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;border:1px solid " + border + ";background:" + bg + ";color:" + fg + ";font:500 13px/1.3 -apple-system,system-ui,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.12);cursor:pointer;transition:transform .15s}" +
        ".ts-badge:hover{transform:translateY(-1px)}" +
        ".ts-dot{width:34px;height:34px;border-radius:50%;background:" + accent + ";display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}" +
        ".ts-panel{display:none;margin-top:10px;width:300px;padding:16px;border-radius:16px;border:1px solid " + border + ";background:" + bg + ";color:" + fg + ";font:400 13px/1.5 -apple-system,system-ui,Segoe UI,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.18)}" +
        ".ts-panel.open{display:block}" +
        ".ts-title{font-weight:600;margin-bottom:6px}" +
        ".ts-score{font-size:28px;font-weight:700;color:" + accent + "}" +
        ".ts-mut{color:" + muted + ";font-size:12px}" +
        ".ts-row{display:flex;align-items:center;gap:8px;margin-top:6px}" +
        ".ts-ok{color:" + accent + "}" +
        ".ts-foot{margin-top:10px;padding-top:10px;border-top:1px solid " + border + ";font-size:11px;color:" + muted + "}" +
        "</style>" +
        '<div class="ts-badge" id="b">' +
          '<div class="ts-dot">✓</div>' +
          '<div><div style="font-size:11px;color:' + muted + '">Verified by TrustSeal</div>' +
          '<div>' + escapeHtml(data.name) + ' · <b>' + score + '</b>/100</div></div>' +
        '</div>' +
        '<div class="ts-panel" id="p">' +
          '<div class="ts-title">Trust score</div>' +
          '<div class="ts-score">' + score + '<span class="ts-mut"> / 100</span></div>' +
          (data.summary ? '<div class="ts-mut" style="margin-top:8px">' + escapeHtml(String(data.summary).slice(0, 220)) + '</div>' : '') +
          '<div class="ts-row"><span class="ts-ok">●</span> AI Act compliance verified</div>' +
          '<div class="ts-row"><span class="ts-ok">●</span> Reviews authenticity checked</div>' +
          '<div class="ts-row"><span class="ts-ok">●</span> Privacy respected</div>' +
          '<div class="ts-foot">trustseal.ai</div>' +
        '</div>';

      var badge = root.getElementById("b");
      var panel = root.getElementById("p");
      badge.addEventListener("click", function () {
        panel.classList.toggle("open");
        beacon("open");
      });
      beacon("view");

      function beacon(type) {
        try {
          fetch(base + "/api/public/widget-event", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ site_id: siteId, event_type: type }),
            keepalive: true,
          }).catch(function () {});
        } catch (_) {}
      }
      function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
      }
    })
    .catch(function () {});
})();
