# AuthServer

> Auth server with OAuth, payments, Docker, CI/CD, and a full developer portal — built from scratch.

AuthServer is a developer-focused authentication and user management platform. It provides app builders with:
- Authentication
- OAuth login
- User management & profiles
- Payments
- Developer portal
- CI/CD deployment automation
- Multi-app controls

It aims to be a self-hostable and customizable alternative to modern auth platforms.

---

## ✨ Features

- 🔐 **Authentication & Sessions**
- 🔑 **OAuth (Google Login)**
- 👥 **User Management + Merge + Groups**
- 💸 **Payments Integration**
- 🧾 **Dynamic JSONB User Fields**
- 🧰 **Developer Portal UI**
- 🐳 **Dockerized Deployment**
- 📦 **Redis-backed pipelines**
- 🔁 **CI/CD (Jenkins)**
- 📧 **Email Templates + Verification**
- 🪝 **Public APIs for Apps**
- 🆔 **Multi-App Support**

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js / Express |
| Auth | OAuth / Sessions / Tokens |
| Infra | Docker / Redis / Jenkins |
| Database | (Your DB here, if you want to specify) |
| Email | Templates + Verification |
| Portal | (Frontend: React? etc. if you want to add) |
| Deployment | Docker + CI/CD |

---

## 📸 Screenshots (Coming Soon)
> This is where I’ll add UI + developer portal screenshots once polished.

---

## 🗺️ Timeline (Commit-Backed)

AuthServer was built over multiple phases totaling **200+ commits** of iteration.

### **Phase 1 — Foundation (Nov 2–27)**
- Auth & login flow
- Plans & CPanel
- Developer portal groundwork

### **Phase 2 — Infra & Tooling (Nov 27–Dec 14)**
- Dockerization & Redis setup
- Developer docs + support email
- Google Login (OAuth)

### **Phase 3 — Payments + CI/CD (Dec 14–28)**
- Payments integration
- Jenkins pipeline
- Rollbacks + build scripts
- Dockerized production
- Email notifications

### **Phase 4 — Product Features (Dec 31–Jan 10)**
- User groups & merge operations
- JSONB dynamic user fields
- Profile update + verification email
- Access token verification
- CORS + backend polish

> Total commits since Dec 25: **218+**

---

## 🚧 Roadmap (Upcoming Improvements)

- More customizable settings for developers
- Granular user permissions
- Advanced session management
- Policy controls for apps
- Enhanced analytics
- Additional OAuth providers
- Better portal UI/UX

---

## 🏗️ Running Locally

```sh
git clone https://github.com/mspk5196/AuthServer.git
cd AuthServer
