# DIJUTECH SOLUTIONS — Backend API

Express + TypeScript REST API for the DIJUTECH SOLUTIONS e-commerce platform.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT (httpOnly cookies) + Google OAuth2
- **Payments:** Paystack
- **Images:** Cloudinary
- **Security:** Helmet, CORS, express-rate-limit

## Project Structure

```
src/
├── controllers/       # Route handlers
│   ├── authController.ts
│   ├── productController.ts
│   ├── orderController.ts
│   ├── paymentController.ts
│   └── accountController.ts
├── routes/            # Express routers
├── models/            # Mongoose schemas
│   ├── User.ts
│   ├── Product.ts
│   ├── Order.ts
│   └── AdminLog.ts
├── middleware/        # Auth guards, error handler
├── lib/               # Utilities
│   ├── db.ts          # MongoDB connection
│   ├── jwt.ts         # Token helpers
│   ├── google.ts      # Google OAuth2
│   ├── cloudinary.ts  # Image uploads
│   ├── paystack.ts    # Payment integration
│   └── logger.ts      # Admin activity logging
├── scripts/           # One-time scripts
│   ├── seedAdmin.ts   # Create first admin user
│   └── resetAdmin.ts  # Reset admin password
└── server.ts          # Entry point
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout (clear cookie) |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google` | Google OAuth redirect |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/token-exchange` | Exchange OAuth token for cookie |
| GET | `/api/products` | List products (with filters) |
| POST | `/api/products` | Create product (admin) |
| PATCH | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |
| POST | `/api/products/upload` | Upload image to Cloudinary |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id` | Update order status |
| POST | `/api/payments/initialize` | Initialize Paystack payment |
| GET | `/api/payments/verify` | Verify payment |
| POST | `/api/payments/webhook` | Paystack webhook |
| GET | `/api/account/profile` | Get user profile |
| PATCH | `/api/account/profile` | Update profile |
| PATCH | `/api/account/password` | Change password |
| GET | `/api/admin/stats` | Dashboard stats (admin) |
| GET | `/api/admin/logs` | Activity logs (admin) |
| GET | `/api/admin/users` | List users (admin) |

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required variables:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/dijutech
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PAYSTACK_SECRET_KEY=sk_test_your-key
```

### 3. Seed the admin user
```bash
npm run seed:admin
```
Creates `admin@dijutech.com` / `Admin@1234` — **change the password after first login**.

### 4. Start development server
```bash
npm run dev
```
Server runs on `http://localhost:5000`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run seed:admin` | Create the first admin user |
| `npm run reset:admin` | Reset admin password |

## Environment Variables

See `.env.example` for all required variables. Never commit `.env` to version control.

## License

MIT — see [LICENSE](./LICENSE)
