/* TrustSeal widget loader — vanilla JS, async, Shadow-DOM isolated, fail-silent. */
(function () {
  "use strict";

  var TOTAL_CHECKS = 14;
  var DISCLAIMER = "AI-assisted analysis. Not legal advice.";
  // Canonical, permanent script origin. Falls back to the origin the script
  // was actually loaded from, so the widget keeps working on any deployment.
  var CANONICAL_ORIGIN = "";

  function checksPassed(score) {
    if (typeof score !== "number") return null;
    var c = Math.max(0, Math.min(100, score));
    return Math.round((c / 100) * TOTAL_CHECKS);
  }

  function statusLine(score) {
    if (typeof score !== "number") return "Compliance scan pending.";
    if (score >= 95) return "Audit ready — no critical issues found.";
    if (score >= 80) return "No critical issues found.";
    if (score >= 50) return "Issues found in the latest automated audit.";
    return "Action required — critical issues found.";
  }

  try {
    var script = document.currentScript;
    if (!script) return;
    var token = script.getAttribute("data-trustseal");
    if (!token) return;

    var apiBase = CANONICAL_ORIGIN || (script.src || "").split("/embed.js")[0];
    if (!apiBase) return;

    function post(path, payload) {
      try {
        fetch(apiBase + path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }

    // Zero-touch auto-activation: ping our API on first load
    post("/api/public/auto-verify", {
      token: token,
      domain: window.location.hostname,
      url: window.location.href
    });

    function track(type) {
      post("/api/public/widget-event", {
        token: token,
        event_type: type,
        meta: { url: window.location.href }
      });
    }

    var hasChatbot = !!document.querySelector('iframe[src*="chat"], div[class*="chat"], #hubspot-messages-iframe-container, [id*="chat"]');

    function render(data) {
      try {
        var cfg = (data && data.widget_config) || {};
        var dark = cfg.theme === "dark";
        var accent = cfg.accent || "#10B981";
        var position = cfg.position || "bottom-right";
        var score = data && typeof data.score === "number" ? data.score : null;
        var passed = checksPassed(score);
        var siteName = (data && (data.name || data.domain)) || window.location.hostname.replace("www.", "");
        var verified = !!data;

        var host = document.createElement("div");
        var side = position.indexOf("left") > -1 ? "left:20px;" : "right:20px;";
        var vert = position.indexOf("top") > -1 ? "top:20px;" : "bottom:20px;";
        host.style.cssText = "position:fixed;z-index:2147483647;" + vert + side;
        document.body.appendChild(host);

        var root = host.attachShadow({ mode: "open" });

        var bg = dark ? "#0a0a0b" : "#ffffff";
        var fg = dark ? "#f5f5f5" : "#0a0a0b";
        var border = dark ? "#27272a" : "#e5e7eb";
        var muted = dark ? "#a1a1aa" : "#6b7280";

        var checksLabel = passed !== null ? passed + "/" + TOTAL_CHECKS : "—/" + TOTAL_CHECKS;
        var stateLine = verified ? statusLine(score) : "This domain is not verified with TrustSeal yet.";

        root.innerHTML = "<style>" +
          ".ts-badge{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;border:1px solid " + border + ";background:" + bg + ";color:" + fg + ";font:500 13px/1.3 -apple-system,system-ui,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.12);cursor:pointer;transition:transform .15s}" +
          ".ts-badge:hover{transform:translateY(-1px)}" +
          ".ts-dot{width:34px;height:34px;border-radius:50%;background:" + accent + ";display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}" +
          ".ts-panel{display:none;margin-top:10px;width:300px;padding:16px;border-radius:16px;border:1px solid " + border + ";background:" + bg + ";color:" + fg + ";font:400 13px/1.5 -apple-system,system-ui,Segoe UI,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.18)}" +
          ".ts-panel.open{display:block;position:absolute;bottom:60px;right:0;}" +
          ".ts-title{font-weight:600;margin-bottom:6px}" +
          ".ts-score{font-size:26px;font-weight:700;color:" + accent + "}" +
          ".ts-mut{color:" + muted + ";font-size:12px}" +
          ".ts-row{display:flex;align-items:center;gap:8px;margin-top:6px}" +
          ".ts-ok{color:" + accent + "}" +
          ".ts-foot{margin-top:10px;padding-top:10px;border-top:1px solid " + border + ";font-size:11px;color:" + muted + "}" +
          "</style>" +
          '<div class="ts-badge" id="b">' +
          '<div class="ts-dot">' + (verified ? "✓" : "!") + '</div>' +
          '<div><div style="font-size:11px;color:' + muted + '">' + (verified ? "Verified by TrustSeal" : "TrustSeal") + '</div>' +
          '<div>' + siteName + ' · <b>' + checksLabel + '</b> checks passed</div></div>' +
          '</div>' +
          '<div class="ts-panel" id="p">' +
          '<div class="ts-title">EU AI Act automated checks</div>' +
          '<div class="ts-score">' + checksLabel + '<span class="ts-mut"> checks passed</span></div>' +
          '<div class="ts-mut" style="margin-top:8px;margin-bottom:8px;">' + stateLine + '</div>' +
          (data && data.summary
            ? '<div class="ts-mut" style="margin-bottom:8px;">' + String(data.summary).slice(0, 180) + '</div>'
            : "") +
          (hasChatbot
            ? '<div class="ts-row"><span class="ts-ok">●</span> AI Chatbot detected on this page</div>'
            : '<div class="ts-row"><span class="ts-ok">●</span> No AI chatbot detected on this page</div>') +
          (data && data.scanned_at
            ? '<div class="ts-row"><span class="ts-ok">●</span> Last audit: ' + new Date(data.scanned_at).toLocaleDateString() + '</div>'
            : "") +
          '<div class="ts-foot">' + DISCLAIMER + '<br>trustseal-ai.com</div>' +
          '</div>';

        var badge = root.getElementById("b");
        var panel = root.getElementById("p");
        track("widget_impression");
        badge.addEventListener("click", function () {
          panel.classList.toggle("open");
          if (panel.classList.contains("open")) track("widget_click");
        });
      } catch (e) {
        /* fail silently — never break the host site */
      }
    }

    function start() {
      try {
        fetch(apiBase + "/api/public/widget/" + encodeURIComponent(token))
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; })
          .then(function (data) {
            // No data / server down → render nothing at all.
            if (!data || data.error) return;
            render(data);
          })
          .catch(function () {});
      } catch (e) {}
    }

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  } catch (e) {
    /* TrustSeal never throws into the host page */
  }
})();
