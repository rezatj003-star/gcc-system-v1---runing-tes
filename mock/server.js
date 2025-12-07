const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.MOCK_PORT || 5052;

app.use(express.json());
app.use(cors()); // allow CORS from any origin (dev only)

// sample transactions
const sampleTransactions = [
  { id: "tx-1", type: "cash-in", amount: 10000, description: "Top up" },
  { id: "tx-2", type: "cash-out", amount: 5000, description: "Withdrawal" },
  { id: "tx-3", type: "cash-in", amount: 25000, description: "Payment received" },
];

// GET /transactions and GET /api/transactions
app.get(["/transactions", "/api/transactions"], (req, res) => {
  res.json(sampleTransactions);
});

// Example auth or user endpoints (adjust to your app)
app.post("/api/login", (req, res) => {
  // send a fake token and user object for dev
  res.json({
    token: "mock-token",
    user: { id: "u1", name: "Mock User", role: "superadmin" },
  });
});

// more endpoints as needed by your frontend
app.get(["/api/users", "/users"], (req, res) => {
  res.json([
    { id: "u1", name: "Admin", role: "superadmin" },
    { id: "u2", name: "Kasir", role: "kasir" },
  ]);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock API server listening at http://localhost:${port}`);
});
