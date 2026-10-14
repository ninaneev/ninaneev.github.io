/* Nina Niamh · small shared script.
   Subscribe forms, Daybrief buy box and buy bar, thanks page session check,
   plus the small moments: scroll reveals, the typing brief, cover tilt, confetti.
   Pages read fine without it; this only adds the live behaviour. */
(function () {
  "use strict";

  var CFG = window.NINA || {};
  var FN = (CFG.FN_BASE || "").replace(/\/$/, "");
  var FAIL = "Something went wrong. Email nina@flowity.ai and I will sort it out.";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqFine = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }
  var hasIO = "IntersectionObserver" in window;

  var ICON_CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_DOWN = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }

  function postJSON(path, body) {
    return fetch(FN + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || "Request failed");
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------- Confetti: a short lilac burst, celebration moments only ---------- */

  function confetti(origin) {
    if (reduced() || !document.body.animate) return;
    var r = origin ? origin.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
    var x0 = r.left + r.width / 2;
    var y0 = r.top + r.height / 2;
    var layer = el("div", "confetti");
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    var n = 26;
    for (var i = 0; i < n; i++) {
      var p = el("i", i % 3 === 0 ? "r" : (i % 7 === 0 ? "s" : ""));
      var size = 5 + Math.random() * 6;
      p.style.width = size + "px";
      p.style.height = (i % 3 === 0 ? size : size * 0.45) + "px";
      p.style.left = x0 + "px";
      p.style.top = y0 + "px";
      p.style.opacity = String(0.55 + Math.random() * 0.45);
      layer.appendChild(p);
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      var dist = 70 + Math.random() * 110;
      var dx = Math.cos(ang) * dist;
      var dy = Math.sin(ang) * dist * 0.75 - 40;
      var rot = (Math.random() * 540 - 270) | 0;
      p.animate([
        { transform: "translate(-50%, -50%) scale(0.6) rotate(0deg)", opacity: 1 },
        { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(1) rotate(" + rot / 2 + "deg)", opacity: 1, offset: 0.55 },
        { transform: "translate(calc(-50% + " + dx * 1.15 + "px), calc(-50% + " + (dy + 90) + "px)) scale(0.9) rotate(" + rot + "deg)", opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
    }
    setTimeout(function () { layer.remove(); }, 1800);
  }

  /* ---------- Subscribe forms ---------- */

  function successPanel(form, data) {
    var box = el("div", "success");
    box.setAttribute("tabindex", "-1");
    box.appendChild(el("span", "tile", ICON_CHECK));
    var msg = form.getAttribute("data-success") || "You're in. Check your inbox.";
    var p = el("p");
    p.textContent = msg;
    box.appendChild(p);
    if (data && data.download_url) {
      var a = el("a", "btn primary", ICON_DOWN + "<span>Download now</span>");
      a.href = data.download_url;
      a.setAttribute("download", "");
      box.appendChild(a);
      var note = el("p", "muted");
      note.textContent = "I also sent the link to your inbox, so it is there when you need it.";
      box.appendChild(note);
    }
    return box;
  }

  function bindForm(form) {
    var source = form.getAttribute("data-source");
    var status = form.querySelector(".form-status");
    var email = form.querySelector('input[name="email"]');
    var first = form.querySelector('input[name="first_name"]');
    var btn = form.querySelector('button[type="submit"]');

    function say(text, isError) {
      if (!status) return;
      status.textContent = text || "";
      status.classList.toggle("error", !!isError);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = (email && email.value || "").trim();
      if (!EMAIL_RE.test(value)) {
        if (email) { email.setAttribute("aria-invalid", "true"); email.focus(); }
        say("Please enter a valid email address.", true);
        return;
      }
      if (email) email.removeAttribute("aria-invalid");
      var body = { email: value, source: source, referrer: window.location.pathname };
      if (first && first.value.trim()) body.first_name = first.value.trim();

      var label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending"; }
      say("");

      postJSON("/nina-subscribe", body).then(function (data) {
        if (!data || data.ok === false) throw new Error("not ok");
        var panel = successPanel(form, data);
        form.replaceWith(panel);
        panel.focus({ preventScroll: true });
        confetti(panel.querySelector(".tile"));
      }).catch(function (err) {
        var msg = err && err.data && err.data.error;
        say(msg && /email/i.test(msg) ? "Please check that email address." : FAIL, true);
        if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
      });
    });
  }

  each("form[data-source]", bindForm);

  /* ---------- Daybrief waitlist (Resend, daybrief-waitlist function) ---------- */

  var WAITLIST_MAILTO = "mailto:nina@flowity.ai?subject=%5BSite%20%C2%B7%20Daybrief%5D%20Tell%20me%20when%20it%27s%20ready";

  // Mirrors normalizeWebsite in the function: empty is fine, otherwise a host with a dot.
  function cleanWebsite(raw) {
    var v = (raw || "").trim();
    if (!v) return "";
    if (v.length > 200 || /\s/.test(v)) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = "https://" + v;
    try {
      var u = new URL(v);
      if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,63}$/.test(u.hostname)) return null;
      return v;
    } catch (e) { return null; }
  }

  function bindWaitlist(form) {
    var status = form.querySelector(".form-status");
    var email = form.querySelector('input[name="email"]');
    var site = form.querySelector('input[name="website"]');
    var hp = form.querySelector('input[name="company"]');
    var btn = form.querySelector('button[type="submit"]');

    function say(text, isError, withMailto) {
      if (!status) return;
      status.textContent = text || "";
      status.classList.toggle("error", !!isError);
      if (withMailto) {
        status.appendChild(document.createTextNode(" "));
        var a = el("a");
        a.href = WAITLIST_MAILTO;
        a.textContent = "Email me instead";
        status.appendChild(a);
        status.appendChild(document.createTextNode(" and I will add you by hand."));
      }
    }
    function invalid(input, on) {
      if (!input) return;
      if (on) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = (email && email.value || "").trim();
      var website = cleanWebsite(site && site.value);
      invalid(email, false);
      invalid(site, false);
      if (!EMAIL_RE.test(value)) {
        invalid(email, true);
        if (email) email.focus();
        say("Please enter a valid email address.", true);
        return;
      }
      if (website === null) {
        invalid(site, true);
        if (site) site.focus();
        say("That website does not look right. Try something like yourcompany.com, or leave it empty.", true);
        return;
      }
      var body = { email: value, referrer: window.location.pathname };
      if (website) body.website = website;
      if (hp && hp.value) body.company = hp.value;

      var label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending"; }
      say("");

      postJSON("/daybrief-waitlist", body).then(function (data) {
        if (!data || data.ok !== true) throw new Error("not ok");
        var box = el("div", "success");
        box.setAttribute("tabindex", "-1");
        box.appendChild(el("span", "tile", ICON_CHECK));
        var p = el("p");
        p.textContent = "Thank you. I'll write when Daybrief is ready.";
        box.appendChild(p);
        var note = el("p", "muted");
        note.textContent = "A short note from me is on its way to your inbox.";
        box.appendChild(note);
        form.replaceWith(box);
        box.focus({ preventScroll: true });
        confetti(box.querySelector(".tile"));
      }).catch(function (err) {
        var code = err && err.data && err.data.error;
        if (code === "invalid_email") { invalid(email, true); say("Please check that email address.", true); }
        else if (code === "invalid_website") { invalid(site, true); say("Please check the website, or leave it empty.", true); }
        else if (code === "rate_limited") say("That was a lot of tries. Give it a few minutes.", true, true);
        else say("Something went wrong on my side.", true, true);
        if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
      });
    });
  }

  each("form[data-waitlist]", bindWaitlist);

  /* ---------- Daybrief buy box ---------- */

  each("[data-buy]", function (box) {
    var wait = box.querySelector("[data-buy-waitlist]");
    var shop = box.querySelector("[data-buy-checkout]");
    /* data-gate names the config flag: SALES_OPEN (Daybrief, default) or EBOOKS_OPEN. */
    if (!CFG[box.getAttribute("data-gate") || "SALES_OPEN"]) return;
    if (wait) wait.hidden = true;
    if (shop) shop.hidden = false;
  });

  each("[data-checkout]", function (btn) {
    var status = btn.parentNode.querySelector(".form-status");
    btn.addEventListener("click", function () {
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Opening secure checkout";
      if (status) { status.textContent = ""; status.classList.remove("error"); }
      var product = btn.getAttribute("data-checkout");
      var req = product ? postJSON("/nina-checkout", { product: product }) : postJSON("/daybrief-checkout", {});
      req.then(function (data) {
        if (!data || !data.url) throw new Error("no url");
        window.location.href = data.url;
      }).catch(function () {
        if (status) { status.textContent = FAIL; status.classList.add("error"); }
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.innerHTML = label;
      });
    });
  });

  /* ---------- Sticky buy bar (phones): shows once the hero buy box is gone,
     hides again when the closing buy box is on screen. ---------- */

  var bar = document.querySelector("[data-buybar]");
  if (bar && hasIO) {
    var cta = bar.querySelector("[data-buybar-cta]");
    if (cta && CFG[bar.getAttribute("data-gate") || "SALES_OPEN"]) cta.textContent = cta.getAttribute("data-open-label") || "Get Daybrief";
    var heroBuy = document.querySelector("[data-buy-hero]");
    var endBuy = document.querySelector("[data-buy-end]");
    var pastHero = false, endVisible = false;
    var sync = function () {
      var show = pastHero && !endVisible;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
      if (cta) cta.tabIndex = show ? 0 : -1;
    };
    document.body.classList.add("has-buybar");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === heroBuy) pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
        if (en.target === endBuy) endVisible = en.isIntersecting;
      });
      sync();
    });
    if (heroBuy) io.observe(heroBuy);
    if (endBuy) io.observe(endBuy);
    sync();
  }

  /* ---------- Thanks page ---------- */

  var thanks = document.querySelector("[data-thanks]");
  if (thanks) {
    var states = thanks.querySelectorAll("[data-state]");
    var show = function (name) {
      Array.prototype.forEach.call(states, function (s) {
        s.hidden = s.getAttribute("data-state") !== name;
      });
    };
    var id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) {
      show("email");
    } else {
      show("loading");
      /* thanks.html uses nina-session (any product); daybrief-thanks.html keeps daybrief-session. */
      var endpoint = thanks.getAttribute("data-endpoint") || "daybrief-session";
      fetch(FN + "/" + endpoint + "?session_id=" + encodeURIComponent(id))
        .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
        .then(function (data) {
          if (data && data.paid) {
            var link = thanks.querySelector("[data-download]");
            var mail = thanks.querySelector("[data-email]");
            if (mail && data.email) mail.textContent = data.email;
            var names = { "daybrief": "Daybrief", "ai-edge": "The AI Edge", "package-it": "Package It" };
            var pname = names[data.product] || "your download";
            each("[data-product]", function (n) { n.textContent = pname; }, thanks);
            each("[data-product-extra]", function (n) { n.hidden = n.getAttribute("data-product-extra") !== data.product; }, thanks);
            if (link && data.download_url) {
              link.href = data.download_url;
              link.hidden = false;
            }
            show("paid");
            confetti(thanks.querySelector('[data-state="paid"] .tile'));
          } else {
            show("pending");
          }
        })
        .catch(function () { show("error"); });
    }
  }

  /* ---------- Scroll reveals: only for things that start below the fold,
     so nothing already on screen ever blinks. ---------- */

  if (hasIO && !reduced()) {
    var targets = document.querySelectorAll("[data-reveal], [data-reveal-group] > *");
    var vh = window.innerHeight;
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        t.classList.add("in");
        rio.unobserve(t);
        /* Hand the element back to its own hover transitions once it has arrived. */
        setTimeout(function () {
          t.classList.remove("reveal-armed", "in");
          t.style.removeProperty("--d");
        }, 1200);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(targets, function (t) {
      if (t.getBoundingClientRect().top < vh * 0.92) return;
      var parent = t.parentElement;
      if (parent && parent.hasAttribute("data-reveal-group")) {
        var idx = Array.prototype.indexOf.call(parent.children, t);
        t.style.setProperty("--d", Math.min(idx, 6) * 60 + "ms");
      }
      t.classList.add("reveal-armed");
      rio.observe(t);
    });
  }

  /* ---------- The typing morning brief (Daybrief hero) ---------- */

  var brief = document.querySelector("[data-brief]");
  if (brief) {
    var lines = brief.querySelectorAll("[data-type]");
    if (!reduced() && lines.length) {
      var caret = el("span", "caret");
      var parts = [];
      Array.prototype.forEach.call(lines, function (line) {
        var text = line.textContent;
        line.textContent = "";
        var ghost = el("span", "t-ghost"); ghost.textContent = text;
        var live = el("span", "t-live");
        line.appendChild(ghost); line.appendChild(live);
        parts.push({ live: live, text: text, sec: line.closest(".brief-sec") });
      });
      brief.classList.add("typing");
      var start = function () {
        var li = 0, ci = 0;
        var tick = function () {
          var p = parts[li];
          if (!p) {
            brief.classList.remove("typing");
            brief.classList.add("done");
            return;
          }
          if (ci === 0) {
            if (p.sec) p.sec.classList.add("on");
            p.live.appendChild(caret);
          }
          ci++;
          p.live.textContent = p.text.slice(0, ci);
          p.live.appendChild(caret);
          if (ci >= p.text.length) { li++; ci = 0; setTimeout(tick, 260); return; }
          var ch = p.text.charAt(ci - 1);
          setTimeout(tick, /[.,:]/.test(ch) ? 120 : 16 + Math.random() * 18);
        };
        setTimeout(tick, 350);
      };
      if (hasIO) {
        var bio = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { bio.disconnect(); start(); }
        }, { threshold: 0.3 });
        bio.observe(brief);
      } else {
        start();
      }
    }
  }

  /* ---------- Cover images: if a PNG is missing, the CSS cover underneath shows ---------- */

  each(".cover img", function (img) {
    var drop = function () { img.remove(); };
    if (img.complete && img.naturalWidth === 0) drop();
    else img.addEventListener("error", drop);
  });

  /* ---------- Cover tilt: follows the pointer on desktop only ---------- */

  if (mqFine && mqFine.matches && !reduced()) {
    each("[data-tilt]", function (stage) {
      var cover = stage.querySelector(".cover");
      if (!cover) return;
      var raf = 0;
      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          cover.classList.add("is-tilting");
          cover.style.transform = "rotateX(" + (-py * 12).toFixed(2) + "deg) rotateY(" + (px * 22).toFixed(2) + "deg)";
        });
      });
      stage.addEventListener("pointerleave", function () {
        cancelAnimationFrame(raf);
        cover.classList.remove("is-tilting");
        cover.style.transform = "";
      });
    });
  }
})();
