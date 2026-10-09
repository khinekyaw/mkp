/*!
 * Booking Widget embed loader.
 *
 *   <script src="https://YOUR-HOST/embed.js" data-business="BUSINESS_ID" async></script>
 *
 * Options (data-* attributes on the script tag):
 *   data-business  Business id from the dashboard (required)
 *   data-lang      "en" | "my" (defaults to the business's first language)
 *   data-mode      "inline" (default) renders in place; "button" adds a floating button
 *   data-label     Button text for button mode
 *   data-target    CSS selector to render into instead of after the script (inline mode)
 *
 * Emits `booking-widget:booked` on window with { id, start, serviceId }.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;

  var origin = new URL(script.src).origin;
  var data = script.dataset;
  var business = data.business;
  if (!business) {
    console.warn("[booking-widget] data-business is required");
    return;
  }
  var mode = data.mode === "button" ? "button" : "inline";
  var lang = data.lang === "my" || data.lang === "en" ? data.lang : "";
  var src = origin + "/embed/" + encodeURIComponent(business) + (lang ? "?lang=" + lang : "");

  // One listener per page, however many widgets are embedded.
  if (!window.__bookingWidgetListener) {
    window.__bookingWidgetListener = true;
    window.addEventListener("message", function (event) {
      if (!event.data || typeof event.data.type !== "string" || event.data.type.indexOf("bw:") !== 0) return;
      var frames = document.querySelectorAll("iframe[data-booking-widget]");
      for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        if (frame.contentWindow !== event.source || event.origin !== frame.getAttribute("data-origin")) continue;
        if (event.data.type === "bw:resize" && event.data.height > 0) frame.style.height = event.data.height + "px";
        if (event.data.type === "bw:booked") {
          window.dispatchEvent(new CustomEvent("booking-widget:booked", { detail: event.data.booking }));
        }
      }
    });
  }

  function createFrame() {
    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Book an appointment";
    iframe.loading = "lazy";
    iframe.setAttribute("data-booking-widget", "");
    iframe.setAttribute("data-origin", origin);
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.cssText =
      "display:block;width:100%;max-width:560px;height:640px;border:0;background:transparent;color-scheme:normal;";
    return iframe;
  }

  if (mode === "inline") {
    var target = data.target ? document.querySelector(data.target) : null;
    var inline = createFrame();
    if (target) target.appendChild(inline);
    else script.parentNode.insertBefore(inline, script.nextSibling);
    return;
  }

  // Button mode: floating launcher that opens the widget in a dialog.
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = data.label || (lang === "my" ? "ရက်ချိန်းယူရန်" : "Book appointment");
  btn.style.cssText =
    "position:fixed;right:20px;bottom:20px;z-index:2147483646;padding:12px 20px;border:0;cursor:pointer;" +
    "font:500 14px/1 system-ui,sans-serif;background:#0a0a0a;color:#fff;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.18);";

  // Match the button to the business's brand once its theme loads.
  fetch(origin + "/api/public/b/" + encodeURIComponent(business))
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (biz) {
      if (!biz || !biz.theme) return;
      var t = biz.theme;
      btn.style.background = t.colors.primary;
      btn.style.color = t.colors.primaryForeground;
      btn.style.borderRadius = Math.max(t.radius, 6) + "px";
      // var() references only resolve inside the widget, not on the host page.
      btn.style.fontFamily = t.fontFamily.replace(/var\([^)]*\),?\s*/g, "");
      if (!data.label && !lang && biz.locales && biz.locales[0] === "my") btn.textContent = "ရက်ချိန်းယူရန်";
    })
    .catch(function () {});

  var overlay = null;
  function close() {
    if (overlay) overlay.remove();
    overlay = null;
    document.removeEventListener("keydown", onKey);
    btn.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  btn.addEventListener("click", function () {
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Book an appointment");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45);overflow:auto;";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      "position:fixed;top:12px;right:12px;width:36px;height:36px;border:0;border-radius:999px;background:#fff;color:#0a0a0a;font:400 22px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2);";
    closeBtn.addEventListener("click", close);
    var frame = createFrame();
    frame.loading = "eager";
    frame.style.maxHeight = "calc(100vh - 32px)";
    overlay.appendChild(closeBtn);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    closeBtn.focus();
  });
  document.body.appendChild(btn);
})();
