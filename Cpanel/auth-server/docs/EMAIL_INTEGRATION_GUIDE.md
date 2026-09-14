# MSPK Email Service — Future Product Integration Guide

This guide explains how to integrate any future MSPK application or service with the **MSPK Central Email Service** (`@mspkapps/email-client` + Admin Panel Email Service).

---

## 1. High-Level Architecture & Core Concepts

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              MSPK Admin Panel                                │
│                     (Central Email Service Platform)                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Product: "Auth Server"                                                 │  │
│  │  ├─ Service Key ID:     esk_...                                        │  │
│  │  ├─ Service Secret:     esks_... (HMAC-SHA256 signature key)           │  │
│  │  ├─ Support Email:      support@mspkapps.in                            │  │
│  │  └─ Named SMTP Profiles:                                               │  │
│  │      ├── "default"   → Global Brevo (or custom SMTP)                   │  │
│  │      ├── "support"   → authservices.mspk@mspkapps.in                   │  │
│  │      └── "client-x"  → Custom SMTP server                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HMAC-SHA256 Signed HTTP POST
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Product Instance (e.g., Auth Server)                      │
│                                                                              │
│  Direct Users (Developers / Product Users)                                   │
│    └─► Dispatched via `smtpProfileName: "support"`                           │
│        (Uses the Support Email entered in the Admin Panel)                   │
│                                                                              │
│  Indirect Users (End-Users of Tenant Apps)                                   │
│    └─► Dispatched via `smtpProfileName: app.email_smtp_profile_name`         │
│        (Custom named SMTP profile configured per app)                        │
│                                                                              │
│  Product-Specific Logic (e.g., Quota limits, rate throttling)                │
│    └─► Managed internally inside the product, dispatch goes to Email Service │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Direct Users vs Indirect Users

| User Category | Definition | Example in Auth Server | Sender Identity |
| :--- | :--- | :--- | :--- |
| **Direct Users** | Users of *your* product directly. | Developers registering on Auth Server, requesting app deletion, etc. | `smtpProfileName: "support"` (The support email entered when registering the product in Admin Panel) |
| **Indirect Users** | Users belonging to downstream resources/tenants inside your product. | End-users of a developer's application registering, resetting passwords, etc. | `smtpProfileName: resource.email_smtp_profile_name` (Custom profile chosen per application) |

---

## 2. Setting Up in Admin Panel

1. **Register Your Product**:
   - Open **MSPK Admin Panel** → **Email Service** → **Products** tab.
   - Click **+ Add Product**.
   - Enter:
     - **Product Name** (e.g., `DialCare`, `FormCraft`, `Auth Server`)
     - **Support Email** (e.g., `support.dialcare@mspkapps.in`)
     - **Monthly Quota** (0 = Unlimited)
   - Save the generated **Service Key ID** (`esk_...`) and **Service Key Secret** (`esks_...`).

2. **Configure Named SMTP Profiles**:
   - Navigate to the **SMTP Profiles** tab and select your product.
   - By default, a `"default"` profile is generated using the global Brevo relay.
   - Click **+ Add Profile** to add specialized profiles:
     - **`support`**: Set `fromEmail` to your official support email.
     - **Custom Profiles**: Uncheck *Use global Brevo SMTP* to provide distinct SMTP host, port, username, and password.
   - Use the **Test** button to dispatch a real test verification email.

---

## 3. Client Installation & SDK Setup

Install the official client in your product:

```bash
npm install @mspkapps/email-client
```

### Environment Variables Required

Add these to your product's `.env` or container environment:

```env
MSPK_EMAIL_SERVICE_URL=https://admin.backend.mspkapps.in
MSPK_EMAIL_SERVICE_KEY_ID=esk_xxxxxxxxxxxxxxxxxxxxxxxx
MSPK_EMAIL_SERVICE_KEY_SECRET=esks_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Implementation Pattern in Your Product

### A. Modern ESM (`import`)

```javascript
import { EmailClient } from '@mspkapps/email-client';

const emailClient = new EmailClient({
  baseUrl: process.env.MSPK_EMAIL_SERVICE_URL,
  serviceKeyId: process.env.MSPK_EMAIL_SERVICE_KEY_ID,
  serviceKeySecret: process.env.MSPK_EMAIL_SERVICE_KEY_SECRET
});

// 1. Direct User Email (Support profile)
await emailClient.send({
  to: 'developer@example.com',
  subject: 'Welcome to MSPK Platform',
  html: '<h1>Welcome!</h1><p>Your developer account is ready.</p>',
  smtpProfileName: 'support',
  metadata: { type: 'onboarding', userId: 'dev-123' }
});

// 2. Indirect User Email (Dynamic profile per tenant/app)
const tenantSmtpProfile = tenant.email_smtp_profile_name || 'default';

await emailClient.send({
  to: 'customer@gmail.com',
  subject: 'Your Order Confirmation',
  html: '<p>Thank you for your order!</p>',
  fromName: tenant.name,
  smtpProfileName: tenantSmtpProfile,
  metadata: { tenantId: tenant.id, orderId: 'ord-987' }
});
```

### B. CommonJS (`require`)

For projects using CommonJS (such as Auth Server):

```javascript
const { createEmailClient } = require('@mspkapps/email-client');

let clientInstance = null;

async function getEmailClient() {
  if (!clientInstance) {
    clientInstance = await createEmailClient({
      baseUrl: process.env.MSPK_EMAIL_SERVICE_URL,
      serviceKeyId: process.env.MSPK_EMAIL_SERVICE_KEY_ID,
      serviceKeySecret: process.env.MSPK_EMAIL_SERVICE_KEY_SECRET
    });
  }
  return clientInstance;
}

async function sendMail({ to, subject, html, smtpProfileName, fromName, metadata }) {
  const client = await getEmailClient();
  return client.send({
    to,
    subject,
    html,
    fromName,
    smtpProfileName: smtpProfileName || 'default',
    metadata
  });
}

module.exports = { sendMail };
```

---

## 5. Storing Profile Names in Your Database

To allow users/tenants in your product to choose from available SMTP profiles:

1. **Add a Column to your Tenant/App Table**:
   ```sql
   ALTER TABLE tenant_apps 
     ADD COLUMN email_smtp_profile_name VARCHAR(100) DEFAULT NULL;
   ```
2. **Profile Selection UI**:
   - Provide an input field or dropdown when creating/editing an app or tenant.
   - Example options: `default`, `support`, `billing`, or custom names.
3. **Runtime Fallback**:
   - If `email_smtp_profile_name` is `NULL` or empty, pass `null` or `'default'` to `@mspkapps/email-client`.
   - The Email Service automatically falls back:
     1. Named profile match
     2. Profile with `isDefault = true`
     3. First profile in product
     4. System Brevo relay fallback

---

## 6. Keeping Product-Specific Logic in Your Product

> **Principle**: Custom business quotas, rate limits, credit balances, or tenant billing stay within your product. The Email Service handles security, HMAC authentication, SMTP dispatch, and audit logs.

### Example: Tenant Quota Enforcement

```javascript
async function sendTenantCustomEmail(req, res) {
  const { tenantId, to, subject, html } = req.body;

  // 1. Product-specific check: Check monthly quota in your own database
  const tenant = await db.getTenant(tenantId);
  if (tenant.mail_count >= tenant.monthly_limit) {
    return res.status(429).json({ error: 'Tenant monthly email quota reached' });
  }

  // 2. Dispatch via Central Email Service
  const result = await emailClient.send({
    to,
    subject,
    html,
    fromName: tenant.brand_name,
    smtpProfileName: tenant.email_smtp_profile_name, // Per-tenant named SMTP
    metadata: { tenantId }
  });

  // 3. Product-specific update: Increment your own counter
  await db.incrementTenantMailCount(tenantId);

  return res.json({ success: true, refId: result.refId });
}
```

---

## 7. Support Conversation Threading

The Email Service generates a unique Reference ID (`EM-XXXXXX`) for every outgoing email and appends a standardized support footer.

To thread follow-ups or replies:

```javascript
// Initial Email
const initial = await emailClient.send({
  to: 'customer@example.com',
  subject: 'Ticket #402 Opened',
  html: '<p>We are looking into your issue.</p>',
  smtpProfileName: 'support'
});
// initial.refId => "EM-4K9P2X"
// initial.threadId => "th_..."

// Follow-up Email (threaded)
await emailClient.send({
  to: 'customer@example.com',
  subject: 'Re: Ticket #402 Update',
  html: '<p>Here is an update regarding your issue.</p>',
  parentRefId: initial.refId, // Automatically links into the same conversation thread
  smtpProfileName: 'support'
});
```

---

## 8. Checklist for Future Products

- [ ] Register product in Admin Panel (`/email-service`)
- [ ] Add at least one `"support"` SMTP profile with your product's support address
- [ ] Add application/tenant custom SMTP profiles if multi-tenant sending is required
- [ ] Add `MSPK_EMAIL_SERVICE_URL`, `MSPK_EMAIL_SERVICE_KEY_ID`, `MSPK_EMAIL_SERVICE_KEY_SECRET` to environment variables
- [ ] Add `email_smtp_profile_name` column to your tenant or app table
- [ ] Use `smtpProfileName: 'support'` for direct user emails (registration, alerts, billing)
- [ ] Use `smtpProfileName: app.email_smtp_profile_name || 'default'` for indirect user emails
- [ ] Keep quota and business logic in the product; let the Email Service handle dispatch and delivery audit logs

