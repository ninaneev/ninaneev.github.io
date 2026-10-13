/* Nina Niamh · small shared script.
   Subscribe forms, Daybrief buy box, thanks page session check.
   Pages read fine without it; this only adds the live behaviour. */
(function () {
  "use strict";

  var CFG = window.NINA || {};
  var FN = (CFG.FN_BASE || "").replace(/\/$/, "");
  var FAIL = "Something went wrong. Email nina@flowity.ai and I will sort it out.";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var ICON_CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_DOWN = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

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
      var body = { email: value, source: source };
      if (first && first.value.trim()) body.first_name = first.value.trim();

      var label = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Sending"; }
      say("");

      postJSON("/nina-subscribe", body).then(function (data) {
        if (!data || data.ok === false) throw new Error("not ok");
        var panel = successPanel(form, data);
        form.replaceWith(panel);
        panel.focus({ preventScroll: true });
      }).catch(function (err) {
        var msg = err && err.data && err.data.error;
        say(msg && /email/i.test(msg) ? "Please check that email address." : FAIL, true);
        if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label; }
      });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-source]"), bindForm);

  /* ---------- Daybrief buy box ---------- */

  Array.prototype.forEach.call(document.querySelectorAll("[data-buy]"), function (box) {
    var wait = box.querySelector("[data-buy-waitlist]");
    var shop = box.querySelector("[data-buy-checkout]");
    if (!CFG.SALES_OPEN) return;
    if (wait) wait.hidden = true;
    if (shop) shop.hidden = false;
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-checkout]"), function (btn) {
    var status = btn.parentNode.querySelector(".form-status");
    btn.addEventListener("click", function () {
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Opening secure checkout";
      if (status) { status.textContent = ""; status.classList.remove("error"); }
      postJSON("/daybrief-checkout", {}).then(function (data) {
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
      fetch(FN + "/daybrief-session?session_id=" + encodeURIComponent(id))
        .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
        .then(function (data) {
          if (data && data.paid) {
            var link = thanks.querySelector("[data-download]");
            var mail = thanks.querySelector("[data-email]");
            if (mail && data.email) mail.textContent = data.email;
            if (link && data.download_url) {
              link.href = data.download_url;
              link.hidden = false;
            }
            show("paid");
          } else {
            show("pending");
          }
        })
        .catch(function () { show("error"); });
    }
  }
})();
