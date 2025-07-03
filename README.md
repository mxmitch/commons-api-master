# 🛠️ Commons API Master

**Commons API Master** is an Express.js + PostgreSQL backend that powers the [Commons Master](https://github.com/mxmitch/commons-master) React frontend. It provides secure, filtered access to Canadian federal legislative data, including bill status, sessions, and machine-learned categories via uClassify.

---

## 🔗 Live App

Frontend: [https://commons-app.netlify.app](https://commons-app.netlify.app)  
Backend: _(deployed via Render, Railway, or local environment)_

---

## 📦 Features

- 📜 Fetch Canadian federal bills from LegisInfo
- 🧠 Assign categories using uClassify API
- 🧮 Filter by status (active/passed), session, house, category
- 🔒 Secure login/registration via JWT
- 💾 PostgreSQL-backed storage
- 🌐 RESTful API used by the Commons Master frontend

---

## 🧭 API Endpoints

### 🧪 Bills

```http
GET /api/bills
```
Query parameters:
- `status=active|passed`
- `session=43-1`
- `senateHouse=senate|commons`
- `category=<uClassify category>`
- `limit`, `offset`

```http
GET /api/bills/:id
```
Returns a single bill by its unique ID.

---

### 🗂️ Categories

```http
GET /api/categories
```
Returns a list of all available categories.

---

### 🔐 Auth

```http
POST /api/auth/register
POST /api/auth/login
```
Returns JWT on success.

Protected routes require:

```
Authorization: Bearer <token>
```

---

## 🛠️ Tech Stack

- **Node.js + Express**
- **PostgreSQL** via `pg`
- **Sequelize** ORM
- **JWT-based auth**
- **CORS + Helmet + Rate Limiters**
- **uClassify API** for category classification

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/mxmitch/commons-api-master.git
cd commons-api-master
npm install
```

### 2. Configure Environment

Create a `.env` file in the root with:

```env
PORT=5000
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<db>
JWT_SECRET=your_secret_key
UCLASSIFY_API_KEY=your_uclassify_api_key
```

### 3. Run Locally

```bash
npm run dev
```

---

## 🧪 Testing

_Tests coming soon._

---

## 🌍 Deployment Notes

- Works well on **Render**, **Railway**, or **Heroku**
- Ensure the database is seeded before launch
- Add environment variables in the deploy settings

---

## 📁 Project Structure

```
.
├── routes/           # billRoutes, authRoutes, categoryRoutes
├── models/           # Sequelize models (Bill, User)
├── middleware/       # Auth, rate limiting, etc.
├── services/         # uClassify integration
└── index.js          # Entry point
```

---

## 📝 License

MIT — see [LICENSE](./LICENSE)

---

## 🙌 Credits

Built by [@mxmitch](https://github.com/mxmitch) as part of the Commons Master project  
Original legislative source: [parl.ca/legisinfo](https://www.parl.ca/legisinfo)  
Classification powered by [uClassify](https://uclassify.com)
