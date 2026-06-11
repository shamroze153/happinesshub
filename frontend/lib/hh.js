/**
 * Happiness Hub — Shared JS Library
 * Include this before any page-specific JS
 */

const HH = (() => {
  // ─── CONFIG ───────────────────────────────────────────────
  const API_URL = "https://script.google.com/macros/s/AKfycbzNKttago6gy0iaqkh78wqLny-m7b6zHa0vWYz1Si3WXnOGjS31dlcD1V1V80Ut5EEt/exec";
  const CURRENCY = "$";

  // ─── API ──────────────────────────────────────────────────
  async function api(action, params = {}, method = "GET", body = null) {
    try {
      let url = `${API_URL}?action=${action}`;
      if (method === "GET") {
        Object.keys(params).forEach(k => {
          if (params[k] !== undefined && params[k] !== null) {
            url += `&${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`;
          }
        });
      }
      const opts = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (method === "POST" && body) {
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(url, opts);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("API error:", err);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  async function get(action, params = {}) {
    return api(action, params, "GET");
  }

  async function post(action, body = {}) {
    return api(action, {}, "POST", { action, ...body });
  }

  // ─── AUTH ──────────────────────────────────────────────────
  function getSession(role) {
    try {
      const s = localStorage.getItem(`hh_session_${role}`);
      return s ? JSON.parse(s) : null;
    } catch (_) { return null; }
  }

  function setSession(role, data) {
    localStorage.setItem(`hh_session_${role}`, JSON.stringify(data));
  }

  function clearSession(role) {
    localStorage.removeItem(`hh_session_${role}`);
  }

  function requireAuth(role, redirectTo) {
    const session = getSession(role);
    if (!session || !session.token) {
      window.location.href = redirectTo || `/${role}-login.html`;
      return null;
    }
    return session;
  }

  function getAuthBody(role) {
    const session = getSession(role);
    if (!session) return {};
    return {
      token: session.token,
      actor_id: session.actor_id,
      actor_type: role,
    };
  }

  // ─── REFERRAL ──────────────────────────────────────────────
  function captureRef() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) sessionStorage.setItem("hh_ref", ref);
    return ref || sessionStorage.getItem("hh_ref");
  }

  function getRef() {
    return sessionStorage.getItem("hh_ref") || "";
  }

  // ─── FORMATTING ────────────────────────────────────────────
  function formatCashback(amount) {
    const n = parseFloat(amount) || 0;
    return `${CURRENCY}${n.toFixed(2)}`;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  }

  function statusBadge(status) {
    const map = {
      "Pending":        { cls: "badge-pending",   icon: "⏳" },
      "Ordered":        { cls: "badge-ordered",   icon: "📦" },
      "Delivered":      { cls: "badge-delivered", icon: "✅" },
      "Cashback Sent":  { cls: "badge-success",   icon: "💸" },
      "Rejected":       { cls: "badge-error",     icon: "❌" },
      "Need More Info": { cls: "badge-warning",   icon: "ℹ️" },
      "PayPal Issue":   { cls: "badge-warning",   icon: "⚠️" },
    };
    const s = map[status] || { cls: "badge-pending", icon: "❓" };
    return `<span class="badge ${s.cls}">${s.icon} ${status || "Unknown"}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── TOAST ─────────────────────────────────────────────────
  function toast(message, type = "info", duration = 3500) {
    let container = document.getElementById("hh-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "hh-toast-container";
      container.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `hh-toast hh-toast-${type}`;
    toast.style.cssText = `
      padding: 12px 20px;
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      animation: toastIn 0.3s ease;
      background: ${type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#6C63FF"};
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ─── IMAGE FALLBACK ────────────────────────────────────────
  function imgWithFallback(src, alt, cls = "") {
    const fallback = `https://placehold.co/400x300/6C63FF/fff?text=${encodeURIComponent(alt || "Product")}`;
    return `<img src="${escapeHtml(src) || fallback}" alt="${escapeHtml(alt)}" class="${cls}" onerror="this.src='${fallback}'" loading="lazy">`;
  }

  // ─── LOADER ────────────────────────────────────────────────
  function showLoader(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:16px;">
        <div class="spinner"></div>
        <p style="color:var(--text-secondary);font-size:14px;">Loading...</p>
      </div>`;
  }

  function showError(containerId, message) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--text-secondary);">
        <div style="font-size:48px;margin-bottom:16px;">😕</div>
        <p>${escapeHtml(message)}</p>
        <button onclick="location.reload()" class="btn-primary" style="margin-top:20px;">Try Again</button>
      </div>`;
  }

  // ─── FILE → BASE64 ─────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) throw new Error("File must be under 5MB");
    const base64data = await fileToBase64(file);
    const result = await post("uploadFile", {
      filename: file.name,
      base64data,
      mimetype: file.type,
    });
    if (!result.success) throw new Error(result.error || "Upload failed");
    return result.url;
  }

  return {
    api, get, post,
    getSession, setSession, clearSession, requireAuth, getAuthBody,
    captureRef, getRef,
    formatCashback, timeAgo, statusBadge, escapeHtml, imgWithFallback,
    toast, showLoader, showError,
    fileToBase64, uploadFile,
  };
})();
