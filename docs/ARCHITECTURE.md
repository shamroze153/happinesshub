# Happiness Hub — Full Architecture

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (modular, no build step needed for MVP)
- **Backend**: Google Apps Script (REST API)
- **Database**: Google Sheets (6 sheets)
- **File Storage**: Google Drive
- **Hosting**: Vercel (static files)

## System Flow
```
Buyer  →  Portal  →  Apps Script API  →  Google Sheets
Agent  →  Dashboard  →  Apps Script API  →  Google Sheets
Seller →  Dashboard  →  Apps Script API  →  Google Sheets
Admin  →  Dashboard  →  Apps Script API  →  Google Sheets
```

## Google Sheets Structure

### Sheet 1: Products
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | product_id | string | auto UUID |
| B | title | string | required |
| C | link | string | affiliate URL |
| D | cashback_amount | number | required |
| E | image_url | string | direct image link |
| F | sold_by | string | seller name |
| G | policy | string | cashback policy |
| H | category | string | Electronics, Fashion, etc. |
| I | description | string | optional |
| J | deadline | string | optional date |
| K | tags | string | comma-separated |
| L | featured | boolean | TRUE/FALSE |
| M | stock_status | string | Available/Limited/Out |
| N | instructions | string | how to claim |
| O | badge_text | string | "HOT", "NEW", etc. |
| P | status | string | Active/Disabled |
| Q | created_at | timestamp | auto |
| R | seller_id | string | linked seller |

### Sheet 2: Orders
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | order_id | string | auto UUID |
| B | buyer_name | string | required |
| C | buyer_whatsapp | string | required |
| D | product_id | string | FK to Products |
| E | product_title | string | denormalized |
| F | amazon_order_id | string | required |
| G | screenshot_url | string | Google Drive link |
| H | notes | string | optional |
| I | agent_id | string | FK to Agents |
| J | seller_id | string | FK to Sellers |
| K | status | string | Pending/Ordered/Delivered/Cashback Sent/Rejected/Need More Info/PayPal Issue |
| L | cashback_amount | number | |
| M | cashback_proof_url | string | seller uploads |
| N | seller_notes | string | |
| O | submitted_at | timestamp | auto |
| P | updated_at | timestamp | auto |

### Sheet 3: Agents
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | agent_id | string | e.g. agent01 |
| B | name | string | |
| C | password | string | hashed |
| D | email | string | |
| E | whatsapp | string | |
| F | commission_rate | number | % |
| G | total_orders | number | auto-calculated |
| H | total_commission | number | auto-calculated |
| I | status | string | Active/Disabled |
| J | created_at | timestamp | |

### Sheet 4: Sellers
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | seller_id | string | auto UUID |
| B | name | string | |
| C | password | string | hashed |
| D | email | string | |
| E | whatsapp | string | |
| F | store_name | string | |
| G | status | string | Active/Disabled |
| H | created_at | timestamp | |

### Sheet 5: Settings
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | key | string | setting name |
| B | value | string | setting value |

Default settings:
- site_name: Happiness Hub
- hero_title: Earn Cashback On Every Purchase
- hero_subtitle: Browse deals, buy through our links, get real money back
- primary_color: #6C63FF
- whatsapp_support: +92XXXXXXXXXX

### Sheet 6: Activity_Logs
| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | log_id | string | auto |
| B | timestamp | timestamp | |
| C | actor_id | string | who did it |
| D | actor_type | string | admin/agent/seller |
| E | action | string | what happened |
| F | details | string | JSON string |

## API Endpoints (Apps Script)

All endpoints via: `GET/POST https://script.google.com/macros/s/{SCRIPT_ID}/exec`

| Method | action param | Description |
|--------|-------------|-------------|
| GET | getProducts | All active products |
| GET | getProduct | Single product by ID |
| GET | trackOrder | Order by WhatsApp or Order ID |
| POST | submitOrder | Agent submits order |
| POST | agentLogin | Agent authentication |
| GET | getAgentOrders | Orders for agent |
| POST | sellerLogin | Seller authentication |
| GET | getSellerOrders | Orders for seller |
| POST | updateOrderStatus | Seller updates status |
| POST | adminLogin | Admin authentication |
| GET | getAdminDashboard | Full stats |
| POST | addProduct | Admin adds product |
| POST | updateProduct | Admin edits product |
| POST | deleteProduct | Admin deletes product |
| POST | addAgent | Admin adds agent |
| POST | addSeller | Admin adds seller |
| GET | getSettings | Site settings |
