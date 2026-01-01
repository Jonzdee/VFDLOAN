/* src/App.jsx
   Small tweak: Seed demo users button now shows a message below the form instead of using alert()
   (All other behavior unchanged)
*/
import React, { useEffect, useState } from "react";

/*
  App.jsx - Staff + Borrower demo (frontend-only)
  - Staff (staff/vfd2024) can create/disburse loans to users
  - Borrowers can login, view wallet, top-up (simulate), and pay repayments
  - All data persisted locally in localStorage (no backend)
  - Keys: LS_USERS, LS_LOANS, LS_REPAYMENTS, LS_SESSION
*/

const LS_USERS = "demo_users_v1";
const LS_LOANS = "demo_loans_v1";
const LS_REPAYMENTS = "demo_repayments_v1";
const LS_SESSION = "demo_session_v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function nowISO() {
  return new Date().toISOString();
}
function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function loadLocal(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

/* Finance helpers (eligibility & amortization) */
function computeEligibility({
  income = 0,
  existingObligations = 0,
  desiredLoanAmount = 0,
  tenor = 12,
}) {
  income = Number(income || 0);
  existingObligations = Number(existingObligations || 0);
  desiredLoanAmount = Number(desiredLoanAmount || 0);
  tenor = Number(tenor || 12);
  const dti =
    income > 0 ? Math.round((existingObligations / income) * 100) : 100;
  let multiplier = 2;
  if (income >= 500000) multiplier = 6;
  else if (income >= 250000) multiplier = 4;
  else if (income >= 100000) multiplier = 3;
  const maxLoan = Math.round(income * multiplier);
  const isEligible = desiredLoanAmount <= maxLoan && dti <= 50;
  const creditScore = Math.max(
    300,
    Math.min(850, Math.round(500 + income / 2000))
  );
  const riskLevel = isEligible ? "Low" : dti > 50 ? "High" : "Medium";
  const defaultRate = isEligible ? 12 : 20;
  return {
    dti,
    maxLoan,
    isEligible,
    creditScore,
    riskLevel,
    defaultRate,
    explanation: `Income ${income.toLocaleString()}, obligations ${existingObligations.toLocaleString()}, tenor ${tenor} months`,
    checkedAt: nowISO(),
  };
}

function amortizationSchedule(principal, annualRatePercent, months) {
  const P = Number(principal || 0);
  const n = Math.max(1, Number(months || 1));
  const r = Number(annualRatePercent || 0) / 100 / 12;
  let payment = 0;
  if (r === 0) payment = P / n;
  else payment = (P * r) / (1 - Math.pow(1 + r, -n));
  payment = Number(payment.toFixed(2));
  const rows = [];
  let balance = P;
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      month: i,
      payment: Number(payment.toFixed(2)),
      principalPaid: Number(principalPaid.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    });
  }
  return { payment, rows };
}

/* Seed demo users if not present */
function seedDemoIfNeeded() {
  const users = loadLocal(LS_USERS, null);
  if (!users || users.length === 0) {
    const seed = [
      {
        username: "john",
        password: "john123",
        wallet: 0,
        name: "John Doe",
        role: "borrower",
      },
      {
        username: "jane",
        password: "jane123",
        wallet: 0,
        name: "Jane Smith",
        role: "borrower",
      },
      {
        username: "staff",
        password: "vfd2024",
        wallet: 0,
        name: "Staff Officer",
        role: "staff",
      },
    ];
    saveLocal(LS_USERS, seed);
    return seed;
  }
  return users;
}

/* Toasts */
function Toasts({ items, remove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`px-4 py-2 rounded shadow text-sm flex items-center justify-between gap-4 ${
            t.type === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          <div>{t.message}</div>
          <button
            onClick={() => remove(t.id)}
            className="opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* Login component (shared for staff & borrowers)
   Updated: Seed demo users button sets a message below the form instead of alert()
*/
function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  useEffect(() => {
    seedDemoIfNeeded();
  }, []);

  async function handleSubmit(e) {
    e?.preventDefault();
    setLoading(true);
    const users = loadLocal(LS_USERS, []);
    await new Promise((r) => setTimeout(r, 200));
    const found = users.find(
      (u) => u.username === form.username && u.password === form.password
    );
    if (found) {
      onLogin(found);
      saveLocal(LS_SESSION, { username: found.username, role: found.role });
    } else {
      alert(
        "Invalid credentials. Demo staff: staff / vfd2024. Demo borrowers: john/john123 or jane/jane123"
      );
    }
    setLoading(false);
  }

  function handleSeedClick() {
    const users = seedDemoIfNeeded();
    // show a message below the form instead of alert
    setSeedMessage(
      "Seeded demo users: john/john123, jane/jane123, staff/vfd2024"
    );
    // clear after 6 seconds
    setTimeout(() => setSeedMessage(""), 6000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-[#633985]">
          VFD Portal — Sign in
        </h2>
        <label className="block mb-3">
          <div className="text-sm text-gray-600">Username</div>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-purple-200"
            required
          />
        </label>
        <label className="block mb-4">
          <div className="text-sm text-gray-600">Password</div>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-purple-200"
            required
          />
        </label>
        <div className="flex gap-2 items-center">
          <button
            className="px-4 py-2 bg-[#633985] text-white rounded-lg shadow"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing..." : "Sign in"}
          </button>
          <button
            type="button"
            className="px-4 py-2 border rounded-lg"
            onClick={handleSeedClick}
          >
            Seed demo users
          </button>
        </div>

        {/* Seed message shown below the form (replaces alert) */}
        {seedMessage && (
          <div className="mt-4 p-3 rounded bg-green-50 text-green-800 text-sm border border-green-100">
            {seedMessage}
          </div>
        )}
      </form>
    </div>
  );
}

/* Staff dashboard: disburse loan, view all loans & repayments
   Enhanced with Eligibility & Review panel (compute eligibility, show amortization)
*/
function StaffDashboard({ staff, pushToast }) {
  const [users, setUsers] = useState(() => loadLocal(LS_USERS, []));
  const [loans, setLoans] = useState(() => loadLocal(LS_LOANS, []));
  const [repayments, setRepayments] = useState(() =>
    loadLocal(LS_REPAYMENTS, [])
  );

  const [form, setForm] = useState({
    borrower: users.find((u) => u.role === "borrower")?.username || "",
    principal: "",
    tenor: 12,
    rate: 12,
  });

  // Eligibility form (separate to avoid clobbering disburse form)
  const [eligForm, setEligForm] = useState({
    borrower: users.find((u) => u.role === "borrower")?.username || "",
    income: "",
    existingObligations: "",
    desiredLoanAmount: "",
    tenor: 12,
    rate: 12,
  });
  const [eligResult, setEligResult] = useState(null);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    setUsers(loadLocal(LS_USERS, []));
    setLoans(loadLocal(LS_LOANS, []));
    setRepayments(loadLocal(LS_REPAYMENTS, []));
  }, []);

  function refreshState() {
    setUsers(loadLocal(LS_USERS, []));
    setLoans(loadLocal(LS_LOANS, []));
    setRepayments(loadLocal(LS_REPAYMENTS, []));
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onEligChange(e) {
    const { name, value } = e.target;
    setEligForm((f) => ({ ...f, [name]: value }));
  }

  function formatCurrency(n) {
    return "₦" + Number(n).toLocaleString("en-NG");
  }

  function disburseLoan(e) {
    e?.preventDefault();
    if (!form.borrower) return pushToast("Select borrower", "error");
    const borrower = loadLocal(LS_USERS, []).find(
      (u) => u.username === form.borrower
    );
    if (!borrower) return pushToast("Borrower not found", "error");
    const principal = Number(form.principal || 0);
    if (!principal || principal <= 0)
      return pushToast("Enter principal", "error");
    const rate = Number(form.rate || 12);
    const tenor = Number(form.tenor || 12);
    // compute monthly payment using amortization helper
    const schedule = amortizationSchedule(principal, rate, tenor);
    const loan = {
      id: uid(),
      borrowerUsername: borrower.username,
      principal,
      balanceRemaining: principal,
      tenor,
      rate,
      monthlyPayment: schedule.payment,
      status: "active",
      createdAt: nowISO(),
      actions: [
        {
          id: uid(),
          action: "disbursed",
          by: staff.username,
          at: nowISO(),
          note: `Disbursed ${principal} at ${rate}%`,
        },
      ],
    };
    // persist loan and credit borrower's wallet
    const allLoans = [loan, ...loadLocal(LS_LOANS, [])];
    saveLocal(LS_LOANS, allLoans);
    const users = loadLocal(LS_USERS, []);
    const idx = users.findIndex((u) => u.username === borrower.username);
    if (idx !== -1) {
      users[idx].wallet = Number(users[idx].wallet || 0) + principal;
      saveLocal(LS_USERS, users);
    }
    pushToast(`Disbursed ${formatCurrency(principal)} to ${borrower.username}`);
    setForm({ ...form, principal: "" });
    refreshState();
  }

  // Eligibility flow: compute results and show schedule
  function checkEligibility(e) {
    e?.preventDefault();
    const data = {
      income: Number(eligForm.income || 0),
      existingObligations: Number(eligForm.existingObligations || 0),
      desiredLoanAmount: Number(eligForm.desiredLoanAmount || 0),
      tenor: Number(eligForm.tenor || 12),
    };
    if (!eligForm.borrower)
      return pushToast("Select borrower for review", "error");
    if (!data.income || data.income <= 0)
      return pushToast("Enter valid income", "error");
    const res = computeEligibility(data);
    // prefill suggested rate if user hasn't manually set one
    setEligResult(res);
    setEligForm((f) => ({ ...f, rate: f.rate || res.defaultRate }));
    setSchedule(
      amortizationSchedule(data.desiredLoanAmount, res.defaultRate, data.tenor)
    );
    pushToast("Eligibility checked");
  }

  // Approve and disburse based on eligibility output and amortization preview
  function approveAndDisburse() {
    if (!eligResult) return pushToast("Run eligibility first", "error");
    const borrower = loadLocal(LS_USERS, []).find(
      (u) => u.username === eligForm.borrower
    );
    if (!borrower) return pushToast("Borrower not found", "error");
    const principal = Number(eligForm.desiredLoanAmount || 0);
    if (!principal || principal <= 0)
      return pushToast("Invalid principal", "error");
    // if not eligible, warn but still allow staff override
    if (!eligResult.isEligible) {
      const ok = window.confirm(
        "Borrower is not eligible based on checks. Proceed to disburse anyway?"
      );
      if (!ok) return;
    }
    const rate = Number(eligForm.rate || eligResult.defaultRate || 12);
    const tenor = Number(eligForm.tenor || 12);
    const sched = amortizationSchedule(principal, rate, tenor);
    const loan = {
      id: uid(),
      borrowerUsername: borrower.username,
      principal,
      balanceRemaining: principal,
      tenor,
      rate,
      monthlyPayment: sched.payment,
      status: "active",
      createdAt: nowISO(),
      eligibilitySnapshot: eligResult,
      actions: [
        {
          id: uid(),
          action: "approved_disbursement",
          by: staff.username,
          at: nowISO(),
          note: `Approved after eligibility check — rate ${rate}%`,
        },
      ],
    };
    // persist loan and credit borrower
    const allLoans = [loan, ...loadLocal(LS_LOANS, [])];
    saveLocal(LS_LOANS, allLoans);
    const users = loadLocal(LS_USERS, []);
    const idx = users.findIndex((u) => u.username === borrower.username);
    if (idx !== -1) {
      users[idx].wallet = Number(users[idx].wallet || 0) + principal;
      saveLocal(LS_USERS, users);
    }
    pushToast(
      `Approved & disbursed ${formatCurrency(principal)} to ${
        borrower.username
      }`
    );
    // clear eligibility state
    setEligForm({
      borrower: users.find((u) => u.role === "borrower")?.username || "",
      income: "",
      existingObligations: "",
      desiredLoanAmount: "",
      tenor: 12,
      rate: 12,
    });
    setEligResult(null);
    setSchedule(null);
    refreshState();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#633985]">Staff Dashboard</h2>
        <div className="text-sm text-gray-600">
          You are: <strong>{staff.username}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Eligibility & Review Card */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Eligibility & Review</h3>
              <div className="text-xs text-gray-500">
                Quick credit check + amortization preview
              </div>
            </div>
            <div className="text-sm text-gray-400">🔎</div>
          </div>

          <label className="block mb-2">
            <div className="text-xs text-gray-600">Select borrower</div>
            <select
              value={eligForm.borrower}
              name="borrower"
              onChange={onEligChange}
              className="w-full p-2 border rounded mt-1"
            >
              {users
                .filter((u) => u.role === "borrower")
                .map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.username} — {u.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="block mb-2">
            <div className="text-xs text-gray-600">Monthly Income (₦)</div>
            <input
              name="income"
              value={eligForm.income}
              onChange={onEligChange}
              className="w-full p-2 border rounded mt-1"
              placeholder="e.g. 150000"
            />
          </label>

          <label className="block mb-2">
            <div className="text-xs text-gray-600">
              Existing monthly obligations (₦)
            </div>
            <input
              name="existingObligations"
              value={eligForm.existingObligations}
              onChange={onEligChange}
              className="w-full p-2 border rounded mt-1"
              placeholder="e.g. 20000"
            />
          </label>

          <label className="block mb-2">
            <div className="text-xs text-gray-600">Desired loan amount (₦)</div>
            <input
              name="desiredLoanAmount"
              value={eligForm.desiredLoanAmount}
              onChange={onEligChange}
              className="w-full p-2 border rounded mt-1"
              placeholder="e.g. 500000"
            />
          </label>

          <div className="flex gap-2">
            <label className="block flex-1">
              <div className="text-xs text-gray-600">Tenor (months)</div>
              <input
                name="tenor"
                type="number"
                value={eligForm.tenor}
                onChange={onEligChange}
                className="w-full p-2 border rounded mt-1"
              />
            </label>
            <label className="block w-36">
              <div className="text-xs text-gray-600">Rate (%)</div>
              <input
                name="rate"
                type="number"
                value={eligForm.rate}
                onChange={onEligChange}
                className="w-full p-2 border rounded mt-1"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={checkEligibility}
              className="px-4 py-2 bg-gradient-to-r from-[#7b56b3] to-[#633985] text-white rounded-lg shadow"
            >
              Check eligibility
            </button>
            <button
              onClick={() =>
                setEligForm({
                  borrower:
                    users.find((u) => u.role === "borrower")?.username || "",
                  income: "",
                  existingObligations: "",
                  desiredLoanAmount: "",
                  tenor: 12,
                  rate: 12,
                })
              }
              className="px-4 py-2 border rounded-lg"
            >
              Reset
            </button>
          </div>

          {/* Eligibility result */}
          {eligResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    Risk:{" "}
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        eligResult.riskLevel === "Low"
                          ? "bg-green-100 text-green-800"
                          : eligResult.riskLevel === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {eligResult.riskLevel}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    DTI: {eligResult.dti}% • Max loan:{" "}
                    {formatCurrency(eligResult.maxLoan)} • Credit score:{" "}
                    {eligResult.creditScore}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Checked</div>
                  <div className="text-sm">
                    {new Date(eligResult.checkedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-gray-700">{eligResult.explanation}</div>
                <div className="mt-2">
                  Suggested rate: <strong>{eligResult.defaultRate}%</strong>
                </div>
              </div>

              <div className="mt-4 flex gap-2 items-center">
                <button
                  onClick={() => {
                    // recompute schedule using selected rate/amount
                    const principal = Number(eligForm.desiredLoanAmount || 0);
                    const rate = Number(
                      eligForm.rate || eligResult.defaultRate || 12
                    );
                    const tenor = Number(eligForm.tenor || 12);
                    if (!principal || principal <= 0)
                      return pushToast(
                        "Invalid principal for schedule",
                        "error"
                      );
                    const s = amortizationSchedule(principal, rate, tenor);
                    setSchedule(s);
                    pushToast("Amortization preview updated");
                  }}
                  className="px-3 py-2 bg-white border rounded"
                >
                  Preview schedule
                </button>

                {eligResult.isEligible ? (
                  <button
                    onClick={approveAndDisburse}
                    className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
                  >
                    Approve & Disburse
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // allow override disbursement even if not eligible
                      const ok = window.confirm(
                        "Borrower is not eligible. Proceed to Approve & Disburse (override)?"
                      );
                      if (ok) approveAndDisburse();
                    }}
                    className="ml-auto px-4 py-2 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600"
                  >
                    Override & Disburse
                  </button>
                )}
              </div>

              {/* Amortization preview */}
              {schedule && (
                <div className="mt-3">
                  <div className="text-sm font-medium">
                    Amortization preview
                  </div>
                  <div className="text-xs text-gray-600">
                    Monthly: <strong>{formatCurrency(schedule.payment)}</strong>
                  </div>
                  <div className="mt-2 max-h-40 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500">
                        <tr>
                          <th className="pr-2">M</th>
                          <th className="pr-2">Payment</th>
                          <th className="pr-2">Principal</th>
                          <th className="pr-2">Interest</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.rows.slice(0, 8).map((r) => (
                          <tr
                            key={r.month}
                            className="odd:bg-white even:bg-gray-50"
                          >
                            <td className="py-1">{r.month}</td>
                            <td className="py-1">
                              {formatCurrency(r.payment)}
                            </td>
                            <td className="py-1">
                              {formatCurrency(r.principalPaid)}
                            </td>
                            <td className="py-1">
                              {formatCurrency(r.interest)}
                            </td>
                            <td className="py-1">
                              {formatCurrency(r.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {schedule.rows.length > 8 && (
                      <div className="text-xs text-gray-500 mt-2">
                        ...showing first 8 months
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Disburse quick card */}
        <form
          onSubmit={disburseLoan}
          className="bg-white p-5 rounded-xl shadow col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Quick Disburse</h3>
              <div className="text-xs text-gray-500">
                Manually create and disburse a loan
              </div>
            </div>
            <div className="text-sm text-gray-400">💸</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <div className="text-xs text-gray-600">Select borrower</div>
              <select
                value={form.borrower}
                name="borrower"
                onChange={onChange}
                className="w-full p-2 border rounded mt-1"
              >
                {users
                  .filter((u) => u.role === "borrower")
                  .map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.username} — {u.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs text-gray-600">Principal (₦)</div>
              <input
                name="principal"
                value={form.principal}
                onChange={onChange}
                className="w-full p-2 border rounded mt-1"
              />
            </label>

            <label className="block">
              <div className="text-xs text-gray-600">Tenor (months)</div>
              <input
                name="tenor"
                value={form.tenor}
                onChange={onChange}
                className="w-full p-2 border rounded mt-1"
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs text-gray-600">Annual rate (%)</div>
              <input
                name="rate"
                value={form.rate}
                onChange={onChange}
                className="w-full p-2 border rounded mt-1"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                className="px-4 py-2 bg-[#633985] text-white rounded-lg shadow"
                type="submit"
              >
                Disburse
              </button>
              <button
                type="button"
                className="px-4 py-2 border rounded-lg"
                onClick={() => {
                  setForm({
                    borrower:
                      users.find((u) => u.role === "borrower")?.username || "",
                    principal: "",
                    tenor: 12,
                    rate: 12,
                  });
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* All loans & ledger */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">All Loans</h4>
            <div className="max-h-72 overflow-auto">
              {loadLocal(LS_LOANS, []).length === 0 ? (
                <div className="text-gray-500">No loans yet</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs text-gray-600">
                    <tr>
                      <th>Borrower</th>
                      <th>Principal</th>
                      <th>Balance</th>
                      <th>Rate</th>
                      <th>Tenor</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadLocal(LS_LOANS, []).map((ln) => (
                      <tr key={ln.id} className="odd:bg-white even:bg-gray-50">
                        <td className="py-2">{ln.borrowerUsername}</td>
                        <td className="py-2">
                          ₦{Number(ln.principal).toLocaleString()}
                        </td>
                        <td className="py-2">
                          ₦{Number(ln.balanceRemaining).toLocaleString()}
                        </td>
                        <td className="py-2">{ln.rate}%</td>
                        <td className="py-2">{ln.tenor}m</td>
                        <td className="py-2">{ln.status}</td>
                        <td className="py-2">
                          <button
                            className="px-2 py-1 border rounded mr-2"
                            onClick={() => {
                              // view loan details — push to local session for UI simplicity
                              const loans = loadLocal(LS_LOANS, []);
                              const found = loans.find((x) => x.id === ln.id);
                              if (found) {
                                saveLocal("view_loan", found);
                                window.alert(JSON.stringify(found, null, 2)); // simple detail display; in future open a page
                              }
                            }}
                          >
                            View
                          </button>
                          <button
                            className="px-2 py-1 bg-yellow-400 rounded"
                            onClick={() => {
                              // manual adjust (e.g., write-off) — simple prompt
                              const amt = Number(
                                prompt(
                                  "Adjust balance by (positive reduces balance):",
                                  "0"
                                )
                              );
                              if (isNaN(amt)) return;
                              const loans = loadLocal(LS_LOANS, []);
                              const idx = loans.findIndex(
                                (x) => x.id === ln.id
                              );
                              if (idx === -1) return;
                              loans[idx].balanceRemaining = Math.max(
                                0,
                                Number(loans[idx].balanceRemaining) - amt
                              );
                              loans[idx].actions = loans[idx].actions || [];
                              loans[idx].actions.push({
                                id: uid(),
                                action: "adjust",
                                by: staff.username,
                                at: nowISO(),
                                note: `adjusted by ${amt}`,
                              });
                              if (loans[idx].balanceRemaining <= 0)
                                loans[idx].status = "closed";
                              saveLocal(LS_LOANS, loans);
                              pushToast(`Adjusted loan ${ln.id}`);
                              setLoans(loadLocal(LS_LOANS, []));
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4">
              <h4 className="font-semibold">Repayments ledger</h4>
              <div className="max-h-40 overflow-auto mt-2">
                {loadLocal(LS_REPAYMENTS, []).length === 0 ? (
                  <div className="text-gray-500">No repayments yet</div>
                ) : (
                  <ul className="text-sm">
                    {loadLocal(LS_REPAYMENTS, []).map((r) => (
                      <li key={r.id} className="py-1 border-b">
                        {new Date(r.date).toLocaleString()} — {r.by} paid ₦
                        {Number(r.amount).toLocaleString()} on loan {r.loanId}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* User dashboard: view wallet, top-up (simulate deposit), view loans, pay repayments */
function UserDashboard({ user, pushToast }) {
  const [users, setUsers] = useState(() => loadLocal(LS_USERS, []));
  const [loans, setLoans] = useState(() => loadLocal(LS_LOANS, []));
  const [repayments, setRepayments] = useState(() =>
    loadLocal(LS_REPAYMENTS, [])
  );
  const [deposit, setDeposit] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({}); // loanId -> amount

  useEffect(() => {
    setUsers(loadLocal(LS_USERS, []));
    setLoans(loadLocal(LS_LOANS, []));
    setRepayments(loadLocal(LS_REPAYMENTS, []));
  }, []);

  function refreshAll() {
    setUsers(loadLocal(LS_USERS, []));
    setLoans(loadLocal(LS_LOANS, []));
    setRepayments(loadLocal(LS_REPAYMENTS, []));
  }

  const myLoans = loadLocal(LS_LOANS, []).filter(
    (l) => l.borrowerUsername === user.username
  );

  function topUp() {
    const amt = Number(deposit || 0);
    if (!amt || amt <= 0) return pushToast("Enter a positive amount", "error");
    const us = loadLocal(LS_USERS, []);
    const idx = us.findIndex((u) => u.username === user.username);
    if (idx === -1) return pushToast("User not found", "error");
    us[idx].wallet = Number(us[idx].wallet || 0) + amt;
    saveLocal(LS_USERS, us);
    setDeposit("");
    refreshAll();
    pushToast(`Wallet topped up by ₦${amt.toLocaleString()}`);
  }

  function payLoan(loanId) {
    const amt = Number(paymentAmounts[loanId] || 0);
    if (!amt || amt <= 0)
      return pushToast("Enter a positive payment amount", "error");
    // load current user wallet
    const us = loadLocal(LS_USERS, []);
    const uidx = us.findIndex((u) => u.username === user.username);
    if (uidx === -1) return pushToast("User not found", "error");
    if (Number(us[uidx].wallet || 0) < amt)
      return pushToast("Insufficient wallet funds", "error");
    // find loan
    const loansAll = loadLocal(LS_LOANS, []);
    const li = loansAll.findIndex((l) => l.id === loanId);
    if (li === -1) return pushToast("Loan not found", "error");
    const loan = loansAll[li];
    const payAmount = Math.min(Number(amt), Number(loan.balanceRemaining));
    // deduct from wallet
    us[uidx].wallet = Number(us[uidx].wallet) - payAmount;
    // reduce loan balance
    loan.balanceRemaining = Number(loan.balanceRemaining) - payAmount;
    loan.actions = loan.actions || [];
    loan.actions.push({
      id: uid(),
      action: "payment",
      by: user.username,
      at: nowISO(),
      note: `paid ${payAmount}`,
    });
    if (loan.balanceRemaining <= 0) {
      loan.status = "closed";
      loan.balanceRemaining = 0;
      loan.actions.push({
        id: uid(),
        action: "closed",
        by: user.username,
        at: nowISO(),
        note: "paid off",
      });
    }
    // save repayment record
    const rep = {
      id: uid(),
      loanId: loan.id,
      amount: payAmount,
      date: nowISO(),
      by: user.username,
    };
    const reps = [rep, ...loadLocal(LS_REPAYMENTS, [])];
    saveLocal(LS_REPAYMENTS, reps);
    // persist loans and users
    loansAll[li] = loan;
    saveLocal(LS_LOANS, loansAll);
    saveLocal(LS_USERS, us);
    refreshAll();
    pushToast(`Paid ₦${payAmount.toLocaleString()} toward loan ${loan.id}`);
    // clear input
    setPaymentAmounts((p) => ({ ...p, [loanId]: "" }));
  }

  function formatCurrency(n) {
    return "₦" + Number(n).toLocaleString("en-NG");
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#633985]">Borrower Dashboard</h2>
        <div className="text-sm">
          Hi, <strong>{user.username}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Wallet</h3>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(
              (
                loadLocal(LS_USERS, []).find(
                  (u) => u.username === user.username
                ) || {}
              ).wallet || 0
            )}
          </div>
          <div className="mt-3">
            <input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="Amount to deposit"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={topUp}
              className="mt-2 px-3 py-2 bg-[#633985] text-white rounded"
            >
              Top up
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow md:col-span-2">
          <h3 className="font-semibold">My Loans</h3>
          <div className="mt-3 space-y-3">
            {myLoans.length === 0 ? (
              <div className="text-gray-500">No active loans</div>
            ) : (
              myLoans.map((ln) => (
                <div key={ln.id} className="p-3 border rounded bg-[#f7f6fb]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">
                        Loan {ln.id} — {ln.status}
                      </div>
                      <div className="text-xs text-gray-600">
                        Principal: {formatCurrency(ln.principal)} • Balance:{" "}
                        {formatCurrency(ln.balanceRemaining)} • Rate: {ln.rate}%
                        • Tenor: {ln.tenor}m
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>
                        Monthly:{" "}
                        <strong>{formatCurrency(ln.monthlyPayment)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="number"
                      value={paymentAmounts[ln.id] || ""}
                      onChange={(e) =>
                        setPaymentAmounts((p) => ({
                          ...p,
                          [ln.id]: e.target.value,
                        }))
                      }
                      placeholder="Amount to pay"
                      className="p-2 border rounded w-48"
                    />
                    <button
                      onClick={() => payLoan(ln.id)}
                      className="px-3 py-2 bg-[#633985] text-white rounded"
                    >
                      Pay from wallet
                    </button>
                    <button
                      onClick={() => {
                        // view amortization quickly
                        const sched = amortizationSchedule(
                          ln.principal,
                          ln.rate,
                          ln.tenor
                        );
                        alert(
                          `Monthly payment ~ ${formatCurrency(
                            sched.payment
                          )}\nFirst 3 months:\n${sched.rows
                            .slice(0, 3)
                            .map(
                              (r) =>
                                `M${r.month}: payment ${formatCurrency(
                                  r.payment
                                )}, principal ${formatCurrency(
                                  r.principalPaid
                                )}, interest ${formatCurrency(
                                  r.interest
                                )}, balance ${formatCurrency(r.balance)}`
                            )
                            .join("\n")}`
                        );
                      }}
                      className="px-3 py-2 border rounded"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Repayment history</h4>
            <div className="mt-2 max-h-48 overflow-auto">
              {loadLocal(LS_REPAYMENTS, []).filter(
                (r) => r.by === user.username
              ).length === 0 ? (
                <div className="text-gray-500">No repayments yet</div>
              ) : (
                <ul className="text-sm">
                  {loadLocal(LS_REPAYMENTS, [])
                    .filter((r) => r.by === user.username)
                    .map((r) => (
                      <li key={r.id} className="py-1 border-b">
                        {new Date(r.date).toLocaleString()} — paid ₦
                        {Number(r.amount).toLocaleString()} (loan {r.loanId})
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Main App */
export default function App() {
  seedDemoIfNeeded(); // ensure demo data present
  const [session, setSession] = useState(() => loadLocal(LS_SESSION, null));
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const s = loadLocal(LS_SESSION, null);
    setSession(s);
  }, []);

  function pushToast(message, type = "success", ttl = 3500) {
    const id = uid();
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), ttl);
  }
  function removeToast(id) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  function handleLogin(user) {
    setSession(user);
    saveLocal(LS_SESSION, user);
  }
  function handleLogout() {
    setSession(null);
    saveLocal(LS_SESSION, null);
  }

  if (!session) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toasts items={toasts} remove={removeToast} />
      <header className="bg-[#633985] text-white p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-[#633985] font-bold">
              VFD
            </div>
            <div>
              <div className="font-bold">VFD Loan Demo</div>
              <div className="text-xs">Local demo — no backend</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              Signed in as <strong>{session.username}</strong>
            </div>
            <button
              onClick={() => {
                handleLogout();
                pushToast("Logged out");
              }}
              className="px-3 py-1 rounded bg-[#a37cc1]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="py-6">
        {session.role === "staff" ? (
          <StaffDashboard staff={session} pushToast={pushToast} />
        ) : (
          <UserDashboard user={session} pushToast={pushToast} />
        )}
      </main>
    </div>
  );
}
