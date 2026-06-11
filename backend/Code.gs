/**
 * Happiness Hub — Google Apps Script Backend
 * Deploy as Web App: Execute as Me, Anyone can access
 *
 * Setup: Replace SPREADSHEET_ID with your Google Sheet ID
 *        Replace DRIVE_FOLDER_ID with your Google Drive folder ID for uploads
 */

const CONFIG = {
  SPREADSHEET_ID: "1NhJ6GobyokHQRsgWA-_BOuIKJyUJ81a-vH8QMr-P1w4",
  DRIVE_FOLDER_ID: "1I-Kdz4gglxD-7A__SLNE4YH2grDMohep",
  ADMIN_PASSWORD: "7869001",
ADMIN_ID: "7869001",
  SESSION_SECRET: "hh_secret_2024", // Change this
};

// ─────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const params = e.parameter || {};
    const body = parseBody(e);
    const action = params.action || body.action;

    if (!action) {
      return jsonResponse({ success: false, error: "No action specified" }, cors);
    }

    const result = route(action, params, body, e);
    return jsonResponse(result, cors);

  } catch (err) {
    logError("handleRequest", err);
    return jsonResponse({ success: false, error: err.message || "Server error" }, cors);
  }
}

function parseBody(e) {
  try { if (e.postData && e.postData.contents) return JSON.parse(e.postData.contents); } catch (_) {}
  // Fall back to GET params if no POST body
  return e.parameter || {};
}

function jsonResponse(data, headers) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

function route(action, params, body, e) {
  switch (action) {
    // Public
    case "getProducts":       return getProducts(params);
    case "getProduct":        return getProduct(params.id);
    case "trackOrder":        return trackOrder(params);
    case "getSettings":       return getSettings();

    // Agent
    case "agentLogin":        return agentLogin(body);
    case "getAgentOrders":    return getAgentOrders(params, body);
    case "submitOrder":       return submitOrder(body, e);

    // Seller
    case "sellerLogin":       return sellerLogin(body);
    case "getSellerOrders":   return getSellerOrders(params, body);
    case "updateOrderStatus": return updateOrderStatus(body);

    // Admin
    case "adminLogin":        return adminLogin(body);
    case "getAdminDashboard": return getAdminDashboard(body);
    case "addProduct":        return addProduct(body);
    case "updateProduct":     return updateProduct(body);
    case "deleteProduct":     return deleteProduct(body);
    case "addAgent":          return addAgent(body);
    case "updateAgent":       return updateAgent(body);
    case "addSeller":         return addSeller(body);
    case "getAgents":         return getAgents(body);
    case "getSellers":        return getSellers(body);
    case "getAllOrders":       return getAllOrders(body);
    case "uploadFile":        return uploadFile(body, e);

    default:
      return { success: false, error: "Unknown action: " + action };
  }
}

// ─────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Auto-create sheet if missing
    sheet = ss.insertSheet(name);
    initSheetHeaders(sheet, name);
  }
  return sheet;
}

function initSheetHeaders(sheet, name) {
  const headers = {
    Products: ["product_id","title","link","cashback_amount","image_url","sold_by","policy","category","description","deadline","tags","featured","stock_status","instructions","badge_text","status","created_at","seller_id"],
    Orders: ["order_id","buyer_name","buyer_whatsapp","product_id","product_title","amazon_order_id","screenshot_url","notes","agent_id","seller_id","status","cashback_amount","cashback_proof_url","seller_notes","submitted_at","updated_at"],
    Agents: ["agent_id","name","password","email","whatsapp","commission_rate","total_orders","total_commission","status","created_at"],
    Sellers: ["seller_id","name","password","email","whatsapp","store_name","status","created_at"],
    Settings: ["key","value"],
    Activity_Logs: ["log_id","timestamp","actor_id","actor_type","action","details"],
  };
  if (headers[name]) {
    sheet.appendRow(headers[name]);
  }
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowIndex(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1; // 1-indexed
  }
  return -1;
}

function generateId(prefix) {
  return prefix + "_" + Utilities.getUuid().replace(/-/g, "").substring(0, 12);
}

function now() {
  return new Date().toISOString();
}

// ─────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────

function hashPassword(password) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));
}

function verifyToken(body, requiredRole) {
  // Simple token verification — in production use proper JWT
  const { token, actor_id, actor_type } = body;
  if (!token || !actor_id || !actor_type) return false;
  if (requiredRole && actor_type !== requiredRole) return false;
  const expected = Utilities.base64Encode(actor_id + ":" + actor_type + ":" + CONFIG.SESSION_SECRET);
  return token === expected;
}

function createToken(actor_id, actor_type) {
  return Utilities.base64Encode(actor_id + ":" + actor_type + ":" + CONFIG.SESSION_SECRET);
}

// ─────────────────────────────────────────────
// PUBLIC: PRODUCTS
// ─────────────────────────────────────────────

function getProducts(params) {
  const sheet = getSheet("Products");
  let products = sheetToObjects(sheet);

  // Filter only active
  products = products.filter(p => p.status === "Active" || p.status === "");

  // Filter by category
  if (params.category && params.category !== "all") {
    products = products.filter(p => p.category === params.category);
  }

  // Search
  if (params.q) {
    const q = params.q.toLowerCase();
    products = products.filter(p =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.tags || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  }

  // Featured first
  if (params.featured === "true") {
    products = products.filter(p => p.featured === true || p.featured === "TRUE");
  }

  // Sort: featured first, then by created_at desc
  products.sort((a, b) => {
    const af = a.featured === true || a.featured === "TRUE";
    const bf = b.featured === true || b.featured === "TRUE";
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Get categories
  const allProducts = sheetToObjects(sheet).filter(p => p.status === "Active" || p.status === "");
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  return { success: true, products, categories, total: products.length };
}

function getProduct(id) {
  if (!id) return { success: false, error: "Product ID required" };
  const sheet = getSheet("Products");
  const products = sheetToObjects(sheet);
  const product = products.find(p => p.product_id === id);
  if (!product) return { success: false, error: "Product not found" };
  return { success: true, product };
}

// ─────────────────────────────────────────────
// PUBLIC: ORDER TRACKING
// ─────────────────────────────────────────────

function trackOrder(params) {
  const { whatsapp, order_id } = params;
  if (!whatsapp && !order_id) {
    return { success: false, error: "Provide WhatsApp number or Order ID" };
  }

  const sheet = getSheet("Orders");
  let orders = sheetToObjects(sheet);

  let results = [];
  if (order_id) {
    results = orders.filter(o =>
      String(o.order_id).toLowerCase() === String(order_id).toLowerCase() ||
      String(o.amazon_order_id).toLowerCase() === String(order_id).toLowerCase()
    );
  } else if (whatsapp) {
    const clean = whatsapp.replace(/\D/g, "");
    results = orders.filter(o => String(o.buyer_whatsapp).replace(/\D/g, "") === clean);
  }

  if (results.length === 0) return { success: false, error: "No orders found" };

  // Clean sensitive fields
  results = results.map(o => ({
    order_id: o.order_id,
    product_title: o.product_title,
    amazon_order_id: o.amazon_order_id,
    status: o.status,
    cashback_amount: o.cashback_amount,
    cashback_proof_url: o.cashback_proof_url,
    seller_notes: o.seller_notes,
    submitted_at: o.submitted_at,
    updated_at: o.updated_at,
  }));

  return { success: true, orders: results };
}

// ─────────────────────────────────────────────
// PUBLIC: SETTINGS
// ─────────────────────────────────────────────

function getSettings() {
  const sheet = getSheet("Settings");
  const rows = sheetToObjects(sheet);
  const settings = {};
  rows.forEach(r => { if (r.key) settings[r.key] = r.value; });
  return { success: true, settings };
}

// ─────────────────────────────────────────────
// AGENT AUTH + ACTIONS
// ─────────────────────────────────────────────

function agentLogin(body) {
  const { agent_id, password } = body;
  if (!agent_id || !password) return { success: false, error: "ID and password required" };

  const sheet = getSheet("Agents");
  const agents = sheetToObjects(sheet);
  const agent = agents.find(a => a.agent_id === agent_id);

  if (!agent) return { success: false, error: "Invalid credentials" };
  if (agent.status === "Disabled") return { success: false, error: "Account disabled" };

  const hashed = hashPassword(password);
  if (agent.password !== hashed && agent.password !== password) {
    return { success: false, error: "Invalid credentials" };
  }

  const token = createToken(agent_id, "agent");
  logActivity(agent_id, "agent", "login", { agent_id });

  return {
    success: true,
    token,
    agent: {
      agent_id: agent.agent_id,
      name: agent.name,
      email: agent.email,
      commission_rate: agent.commission_rate,
    }
  };
}

function getAgentOrders(params, body) {
  if (!verifyToken(body, "agent")) return { success: false, error: "Unauthorized" };
  const { actor_id } = body;

  const sheet = getSheet("Orders");
  let orders = sheetToObjects(sheet);
  orders = orders.filter(o => o.agent_id === actor_id);

  // Sort newest first
  orders.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "Pending").length,
    completed: orders.filter(o => o.status === "Cashback Sent").length,
    total_cashback: orders.filter(o => o.status === "Cashback Sent")
      .reduce((sum, o) => sum + (parseFloat(o.cashback_amount) || 0), 0),
  };

  return { success: true, orders, stats };
}

function submitOrder(body, e) {
  const { token, actor_id, actor_type } = body;

  // Allow both agent-submitted and token-less (buyer self-submit)
  const isAgent = verifyToken(body, "agent");
  const agentId = isAgent ? actor_id : (body.agent_id || "direct");

  const { buyer_name, buyer_whatsapp, product_id, amazon_order_id, notes } = body;

  if (!buyer_name) return { success: false, error: "Buyer name required" };
  if (!buyer_whatsapp) return { success: false, error: "WhatsApp number required" };
  if (!product_id) return { success: false, error: "Product required" };
  if (!amazon_order_id) return { success: false, error: "Order ID required" };

  // Get product details
  const productSheet = getSheet("Products");
  const products = sheetToObjects(productSheet);
  const product = products.find(p => p.product_id === product_id);
  if (!product) return { success: false, error: "Product not found" };

  const order_id = generateId("ORD");
  const row = [
    order_id,
    buyer_name,
    buyer_whatsapp,
    product_id,
    product.title,
    amazon_order_id,
    body.screenshot_url || "",
    notes || "",
    agentId,
    product.seller_id || "",
    "Pending",
    product.cashback_amount,
    "",  // cashback_proof_url
    "",  // seller_notes
    now(),
    now(),
  ];

  const sheet = getSheet("Orders");
  sheet.appendRow(row);

  logActivity(agentId, "agent", "submit_order", { order_id, product_id, buyer_whatsapp });

  return { success: true, order_id, message: "Order submitted successfully" };
}

// ─────────────────────────────────────────────
// SELLER AUTH + ACTIONS
// ─────────────────────────────────────────────

function sellerLogin(body) {
  const { seller_id, password } = body;
  if (!seller_id || !password) return { success: false, error: "ID and password required" };

  const sheet = getSheet("Sellers");
  const sellers = sheetToObjects(sheet);
  const seller = sellers.find(s => s.seller_id === seller_id);

  if (!seller) return { success: false, error: "Invalid credentials" };
  if (seller.status === "Disabled") return { success: false, error: "Account disabled" };

  const hashed = hashPassword(password);
  if (seller.password !== hashed && seller.password !== password) {
    return { success: false, error: "Invalid credentials" };
  }

  const token = createToken(seller_id, "seller");
  logActivity(seller_id, "seller", "login", { seller_id });

  return {
    success: true,
    token,
    seller: {
      seller_id: seller.seller_id,
      name: seller.name,
      store_name: seller.store_name,
    }
  };
}

function getSellerOrders(params, body) {
  if (!verifyToken(body, "seller")) return { success: false, error: "Unauthorized" };
  const { actor_id } = body;

  const sheet = getSheet("Orders");
  let orders = sheetToObjects(sheet);
  orders = orders.filter(o => o.seller_id === actor_id);
  orders.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

  // Filter by status
  if (params.status) {
    orders = orders.filter(o => o.status === params.status);
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "Pending").length,
    delivered: orders.filter(o => o.status === "Delivered").length,
    cashback_sent: orders.filter(o => o.status === "Cashback Sent").length,
    rejected: orders.filter(o => o.status === "Rejected").length,
  };

  return { success: true, orders, stats };
}

function updateOrderStatus(body) {
  if (!verifyToken(body, "seller") && !verifyToken(body, "admin")) {
    return { success: false, error: "Unauthorized" };
  }

  const { order_id, status, seller_notes, cashback_proof_url } = body;
  if (!order_id) return { success: false, error: "Order ID required" };

  const validStatuses = ["Pending","Ordered","Delivered","Cashback Sent","Rejected","Need More Info","PayPal Issue"];
  if (status && !validStatuses.includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const sheet = getSheet("Orders");
  const rowIndex = findRowIndex(sheet, 0, order_id);
  if (rowIndex === -1) return { success: false, error: "Order not found" };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf("status") + 1;
  const sellerNotesCol = headers.indexOf("seller_notes") + 1;
  const proofCol = headers.indexOf("cashback_proof_url") + 1;
  const updatedCol = headers.indexOf("updated_at") + 1;

  if (status) sheet.getRange(rowIndex, statusCol).setValue(status);
  if (seller_notes !== undefined) sheet.getRange(rowIndex, sellerNotesCol).setValue(seller_notes);
  if (cashback_proof_url) sheet.getRange(rowIndex, proofCol).setValue(cashback_proof_url);
  sheet.getRange(rowIndex, updatedCol).setValue(now());

  logActivity(body.actor_id, body.actor_type, "update_order_status", { order_id, status });

  return { success: true, message: "Order updated" };
}

// ─────────────────────────────────────────────
// ADMIN AUTH + ACTIONS
// ─────────────────────────────────────────────

function adminLogin(body) {
  const { code } = body;
  if (!code) return { success: false, error: "Access code required" };
  if (String(code).trim() !== String(CONFIG.ADMIN_PASSWORD).trim()) {
    return { success: false, error: "Invalid access code" };
  }
  const token = createToken("admin", "admin");
  logActivity("admin", "admin", "login", {});
  return { success: true, token };
}

  const token = createToken(admin_id, "admin");
  logActivity(admin_id, "admin", "login", {});
  return { success: true, token };
}

function getAgents(body) {
  requireAdmin(body);

function getAdminDashboard(body) {
  requireAdmin(body);

  const orders = sheetToObjects(getSheet("Orders"));
  const products = sheetToObjects(getSheet("Products"));
  const agents = sheetToObjects(getSheet("Agents"));
  const sellers = sheetToObjects(getSheet("Sellers"));

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.submitted_at).toDateString() === today);

  return {
    success: true,
    stats: {
      total_products: products.filter(p => p.status === "Active").length,
      total_orders: orders.length,
      today_orders: todayOrders.length,
      total_agents: agents.filter(a => a.status === "Active").length,
      total_sellers: sellers.filter(s => s.status === "Active").length,
      pending_orders: orders.filter(o => o.status === "Pending").length,
      cashback_sent: orders.filter(o => o.status === "Cashback Sent").length,
      total_cashback_sent: orders
        .filter(o => o.status === "Cashback Sent")
        .reduce((sum, o) => sum + (parseFloat(o.cashback_amount) || 0), 0),
    },
    recent_orders: orders
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(0, 10),
  };
}

function addProduct(body) {
  requireAdmin(body);

  const { title, link, cashback_amount, image_url, sold_by, policy, category } = body;
  if (!title) return { success: false, error: "Title required" };
  if (!link) return { success: false, error: "Product link required" };
  if (!cashback_amount) return { success: false, error: "Cashback amount required" };
  if (!category) return { success: false, error: "Category required" };

  const product_id = generateId("PRD");
  const row = [
    product_id,
    title,
    link,
    parseFloat(cashback_amount) || 0,
    image_url || "",
    sold_by || "",
    policy || "",
    category,
    body.description || "",
    body.deadline || "",
    body.tags || "",
    body.featured ? "TRUE" : "FALSE",
    body.stock_status || "Available",
    body.instructions || "",
    body.badge_text || "",
    "Active",
    now(),
    body.seller_id || "",
  ];

  getSheet("Products").appendRow(row);
  logActivity(body.actor_id, "admin", "add_product", { product_id, title });

  return { success: true, product_id, message: "Product added" };
}

function updateProduct(body) {
  requireAdmin(body);
  const { product_id } = body;
  if (!product_id) return { success: false, error: "Product ID required" };

  const sheet = getSheet("Products");
  const rowIndex = findRowIndex(sheet, 0, product_id);
  if (rowIndex === -1) return { success: false, error: "Product not found" };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const updatable = ["title","link","cashback_amount","image_url","sold_by","policy","category",
    "description","deadline","tags","featured","stock_status","instructions","badge_text","status","seller_id"];

  updatable.forEach(field => {
    if (body[field] !== undefined) {
      const col = headers.indexOf(field) + 1;
      if (col > 0) sheet.getRange(rowIndex, col).setValue(body[field]);
    }
  });

  logActivity(body.actor_id, "admin", "update_product", { product_id });
  return { success: true, message: "Product updated" };
}

function deleteProduct(body) {
  requireAdmin(body);
  const { product_id } = body;
  if (!product_id) return { success: false, error: "Product ID required" };

  const sheet = getSheet("Products");
  const rowIndex = findRowIndex(sheet, 0, product_id);
  if (rowIndex === -1) return { success: false, error: "Product not found" };

  // Soft delete — set status to Deleted
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf("status") + 1;
  sheet.getRange(rowIndex, statusCol).setValue("Deleted");

  logActivity(body.actor_id, "admin", "delete_product", { product_id });
  return { success: true, message: "Product deleted" };
}

function addAgent(body) {
  requireAdmin(body);
  const { agent_id, name, password } = body;
  if (!agent_id || !name || !password) return { success: false, error: "ID, name, and password required" };

  // Check duplicate
  const sheet = getSheet("Agents");
  const existing = sheetToObjects(sheet).find(a => a.agent_id === agent_id);
  if (existing) return { success: false, error: "Agent ID already exists" };

  sheet.appendRow([
    agent_id,
    name,
    hashPassword(password),
    body.email || "",
    body.whatsapp || "",
    parseFloat(body.commission_rate) || 0,
    0,  // total_orders
    0,  // total_commission
    "Active",
    now(),
  ]);

  logActivity(body.actor_id, "admin", "add_agent", { agent_id, name });
  return { success: true, message: "Agent added" };
}

function updateAgent(body) {
  requireAdmin(body);
  const { agent_id, status } = body;
  if (!agent_id) return { success: false, error: "Agent ID required" };

  const sheet = getSheet("Agents");
  const rowIndex = findRowIndex(sheet, 0, agent_id);
  if (rowIndex === -1) return { success: false, error: "Agent not found" };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (status) {
    const col = headers.indexOf("status") + 1;
    sheet.getRange(rowIndex, col).setValue(status);
  }

  return { success: true, message: "Agent updated" };
}

function addSeller(body) {
  requireAdmin(body);
  const { name, password, store_name } = body;
  if (!name || !password) return { success: false, error: "Name and password required" };

  const seller_id = generateId("SEL");
  const sheet = getSheet("Sellers");

  sheet.appendRow([
    seller_id,
    name,
    hashPassword(password),
    body.email || "",
    body.whatsapp || "",
    store_name || name,
    "Active",
    now(),
  ]);

  logActivity(body.actor_id, "admin", "add_seller", { seller_id, name });
  return { success: true, seller_id, message: "Seller added" };
}

function getAgents(body) {
  requireAdmin(body);
  const agents = sheetToObjects(getSheet("Agents")).map(a => ({
    ...a, password: undefined
  }));
  return { success: true, agents };
}

function getSellers(body) {
  requireAdmin(body);
  const sellers = sheetToObjects(getSheet("Sellers")).map(s => ({
    ...s, password: undefined
  }));
  return { success: true, sellers };
}

function getAllOrders(body) {
  if (!verifyToken(body, "admin")) return { success: false, error: "Unauthorized" };
  const orders = sheetToObjects(getSheet("Orders"));
  orders.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  return { success: true, orders };
}

// ─────────────────────────────────────────────
// FILE UPLOAD (Base64 to Google Drive)
// ─────────────────────────────────────────────

function uploadFile(body, e) {
  const { filename, base64data, mimetype } = body;
  if (!base64data || !filename) return { success: false, error: "File data required" };

  try {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const decoded = Utilities.newBlob(Utilities.base64Decode(base64data), mimetype || "image/jpeg", filename);
    const file = folder.createFile(decoded);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = "https://drive.google.com/uc?id=" + file.getId();
    return { success: true, url, file_id: file.getId() };
  } catch (err) {
    return { success: false, error: "Upload failed: " + err.message };
  }
}

// ─────────────────────────────────────────────
// ACTIVITY LOGGING
// ─────────────────────────────────────────────

function logActivity(actor_id, actor_type, action, details) {
  try {
    const sheet = getSheet("Activity_Logs");
    sheet.appendRow([
      generateId("LOG"),
      now(),
      actor_id || "system",
      actor_type || "system",
      action,
      JSON.stringify(details || {}),
    ]);
  } catch (err) {
    // Non-fatal — don't break main flow if logging fails
    console.error("Log failed:", err.message);
  }
}

function logError(context, err) {
  console.error("[" + context + "]", err.message, err.stack);
}

// ─────────────────────────────────────────────
// SETUP HELPER (run once manually)
// ─────────────────────────────────────────────

function setupSheets() {
  const names = ["Products","Orders","Agents","Sellers","Settings","Activity_Logs"];
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  names.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      initSheetHeaders(sheet, name);
      Logger.log("Created sheet: " + name);
    } else {
      Logger.log("Sheet exists: " + name);
    }
  });

  // Add default settings
  const settingsSheet = ss.getSheetByName("Settings");
  const existing = sheetToObjects(settingsSheet).map(r => r.key);
  const defaults = [
    ["site_name", "Happiness Hub"],
    ["hero_title", "Earn Real Cashback On Every Purchase"],
    ["hero_subtitle", "Browse deals, buy through our links, get your money back"],
    ["primary_color", "#6C63FF"],
    ["whatsapp_support", "+923001234567"],
    ["currency", "$"],
    ["currency_symbol", "$"],
  ];
  defaults.forEach(([key, value]) => {
    if (!existing.includes(key)) settingsSheet.appendRow([key, value]);
  });

  Logger.log("Setup complete!");
}
