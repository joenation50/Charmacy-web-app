/* Theme + UI helpers */
(function () {
  const KEY = 'cm-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const sys = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const initial = saved || sys;
  root.setAttribute('data-theme', initial);

  function icons(t) {
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.className = 'fas ' + (t === 'dark' ? 'fa-sun' : 'fa-moon');
    });
  }

  function apply(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    window.CM.theme = t;
    icons(t);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }

  window.CM = {
    theme: initial,
    setTheme(t, ev) {
      if (!document.startViewTransition || !ev) { apply(t); return; }
      const r = ev.currentTarget?.getBoundingClientRect?.();
      const x = r ? r.left + r.width / 2 : innerWidth - 44;
      const y = r ? r.top + r.height / 2 : 44;
      root.style.setProperty('--vt-x', x + 'px');
      root.style.setProperty('--vt-y', y + 'px');
      root.style.setProperty('--vt-r', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
      document.startViewTransition(() => apply(t));
    },
    toggle(ev) { this.setTheme(this.theme === 'dark' ? 'light' : 'dark', ev); },

    toast(msg, type = 'info') {
      let stack = document.getElementById('toast-stack');
      if (!stack) { stack = document.createElement('div'); stack.id = 'toast-stack'; document.body.appendChild(stack); }
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      const ic = type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info';
      el.innerHTML = `<i class="fas ${ic}"></i><span>${msg}</span>`;
      stack.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 3200);
    },

    async copy(text, okMsg = 'Copied to clipboard') {
      try { await navigator.clipboard.writeText(text); this.toast(okMsg, 'ok'); return true; }
      catch { prompt('Copy manually:', text); return false; }
    },

    mapStyle() {
      return root.getAttribute('data-theme') === 'light'
        ? 'https://tiles.openfreemap.org/styles/positron'
        : 'https://tiles.openfreemap.org/styles/dark';
    },

    // geo helpers
    dist(a, b) {
      const R = 6371000, p = Math.PI / 180;
      const dLat = (b.lat - a.lat) * p, dLng = (b.lng - a.lng) * p;
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    },
    bearing(a, b) {
      const p = Math.PI / 180, y = Math.sin((b.lng - a.lng) * p) * Math.cos(b.lat * p);
      const x = Math.cos(a.lat * p) * Math.sin(b.lat * p) - Math.sin(a.lat * p) * Math.cos(b.lat * p) * Math.cos((b.lng - a.lng) * p);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    },

    // journey stages
    STAGES: [
      { label: 'Placed', icon: 'fa-receipt' },
      { label: 'Assigned', icon: 'fa-user-check' },
      { label: 'Picked Up', icon: 'fa-box' },
      { label: 'On the Move', icon: 'fa-route' },
      { label: 'Almost There', icon: 'fa-location-dot' },
      { label: 'Delivered', icon: 'fa-circle-check' }
    ],
    progress(rider, start, dest) {
      if (!rider || !start || !dest) return null;
      const total = this.dist(start, dest), rem = this.dist(rider, dest);
      if (total < 40) return rem < 40 ? 100 : 90;
      return Math.max(2, Math.min(99, Math.round((1 - rem / total) * 100)));
    },
    stage(order, hasFix, pct) {
      if (order.status === 'delivered') return 5;
      if (order.status === 'cancelled') return 0;
      if (!order.riderName) return 0;
      if (!hasFix) return 1;
      if (pct == null) return 2;
      if (pct >= 92) return 4;
      if (pct >= 10) return 3;
      return 2;
    },

    countUp(el, to, ms = 900) {
      const from = 0, t0 = performance.now();
      function frame(t) {
        const p = Math.min((t - t0) / ms, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    ago(ms) {
      if (!ms) return '—';
      const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
      if (s < 10) return 'just now';
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.round(s / 60) + 'm ago';
      if (s < 86400) return Math.round(s / 3600) + 'h ago';
      return Math.round(s / 86400) + 'd ago';
    },
    naira(v) { return v || v === 0 ? '₦' + Number(v).toLocaleString('en-NG') : '—'; },
    ts(v) {
      if (!v) return 0;
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const p = Date.parse(v); return isFinite(p) ? p : 0; }
      if (typeof v.seconds === 'number') return v.seconds * 1000;
      return 0;
    }
  };

  icons(initial);
  document.addEventListener('DOMContentLoaded', () => icons(root.getAttribute('data-theme')));
})();