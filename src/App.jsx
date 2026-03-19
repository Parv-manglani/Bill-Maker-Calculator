import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const USERS = [
  { username: "parv", password: "1234" },
  { username: "shop1", password: "abcd" }
];

const calcButtons = [
  "7", "8", "9", "⌫",
  "4", "5", "6", "C",
  "1", "2", "3", "+",
  "0", "*", ".", "=",
];

const sanitizeExpression = (expr) =>
  expr
    .replace(/\s+/g, "")
    .replace(/[^0-9+\-*./]/g, "")
    .replace(/(\*{2,}|\+{2,}|-{2,}|\/{2,})/g, "+")
    .replace(/^\+/, "")
    .replace(/\+$/, "");

const parseInvoiceItems = (expression) => {
  const cleaned = sanitizeExpression(expression);
  if (!cleaned) return [];

  const parts = cleaned.split("+").filter((part) => part.trim() !== "");
  const items = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const [ratePart, qtyPart] = part.split("*").map((p) => p.trim());
    const rate = Number(ratePart || 0);
    const qty = Number(qtyPart || 0);

    if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty < 0 || rate < 0) {
      continue;
    }

    items.push({
      id: i + 1,
      name: `Item${i + 1}`,
      qty,
      rate,
      total: qty * rate,
      raw: part,
    });
  }

  return items;
};

const formatWhatsAppMessage = (items, grandTotal) => {
  const lines = ["Invoice:"];
  items.forEach((item) => {
    const name = item.name?.trim() ? item.name.trim() : `Item${item.id}`;
    lines.push(`${name} - ${item.qty} x ${item.rate} = ${item.total}`);
  });
  lines.push("");
  lines.push(`Grand Total: ₹${grandTotal}`);
  return encodeURIComponent(lines.join("\n"));
};

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-200">
      <div className="bg-white p-8 rounded-xl shadow-xl w-80">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">Invoice Calculator</h2>

        <input
          className="w-full mb-4 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onLogin(username, password)}
        />

        <input
          type="password"
          className="w-full mb-6 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onLogin(username, password)}
        />

        <button
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          onClick={() => onLogin(username, password)}
        >
          Login
        </button>
      </div>
    </div>
  );
};

const generateStyledInvoice = (items, total) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 600;
  canvas.height = 900;

  // Background
  ctx.fillStyle = "#1f1f1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(20, 80, 560, 740);

  let y = 110;

  // Title
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Invoice", 40, y);

  y += 35;
  ctx.font = "14px Arial";
  ctx.fillText(`Item Count: ${items.length}`, 40, y);

  y += 40;

  // Table Header
  ctx.font = "bold 14px Arial";
  ctx.fillText("No.", 40, y);
  ctx.fillText("Item", 80, y);
  ctx.fillText("Rate", 280, y);
  ctx.fillText("Qty", 360, y);
  ctx.fillText("Amount", 450, y);

  y += 5;
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(560, y);
  ctx.stroke();

  y += 25;

  // Items
  ctx.font = "13px Arial";
  ctx.fillStyle = "#000";

  items.forEach((item, index) => {
    ctx.fillText((index + 1).toString(), 40, y);
    ctx.fillText(item.name || "Item", 80, y);
    ctx.textAlign = "right";
    ctx.fillText(item.rate.toFixed(2), 330, y);
    ctx.fillText(item.qty.toFixed(2), 395, y);
    ctx.fillText(item.total.toFixed(2), 550, y);
    ctx.textAlign = "left";

    y += 32;
  });

  y += 15;

  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Total:", 40, y);
  ctx.textAlign = "right";
  ctx.fillText(`₹${total.toFixed(2)}`, 550, y);

  ctx.textAlign = "left";
  return canvas.toDataURL("image/png");
};

const generatePDF = (items, total) => {
  const pdf = new jsPDF();

  autoTable(pdf, {
    head: [["Item", "Qty", "Rate", "Total"]],
    body: items.map((item) => [
      item.name?.trim() ? item.name.trim() : `Item${item.id}`,
      item.qty.toFixed(2),
      item.rate.toFixed(2),
      item.total.toFixed(2),
    ]),
  });

  pdf.text(`Grand Total: ₹${total.toFixed(2)}`, 14, pdf.lastAutoTable.finalY + 10);

  pdf.save("invoice.pdf");
};

const ItemRow = ({ item, onNameChange }) => (
  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 items-center py-2 border-b border-slate-200">
    <input
      type="text"
      className="px-2 py-1 rounded-md border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
      value={item.name}
      placeholder={`Item${item.id}`}
      onChange={(e) => onNameChange(item.id, e.target.value)}
      aria-label={`Name for ${item.name || `Item${item.id}`}`}
    />
    <div className="text-right text-sm font-medium">{item.qty}</div>
    <div className="text-right text-sm font-medium">{item.rate}</div>
    <div className="text-right text-sm font-semibold">{item.total}</div>
  </div>
);

const CalculatorButtons = ({ onPress }) => (
  <div className="grid grid-cols-4 gap-3">
    {calcButtons.map((label) => {
      const isAction = ["C", "⌫", "="].includes(label);
      const btnStyles = `flex items-center justify-center h-20 rounded-xl font-bold ${
        isAction ? "bg-indigo-600 text-white hover:bg-indigo-500 text-2xl" : "bg-slate-100 text-slate-800 hover:bg-slate-200 text-2xl"
      }`;
      return (
        <button
          key={label}
          className={btnStyles}
          onClick={() => onPress(label)}
        >
          <span>{label}</span>
        </button>
      );
    })}
  </div>
);

const InvoiceView = ({ items, total, onNameChange, onRateChange, onQtyChange, onDeleteItem, goBack, onShareImage, onDownloadPDF, onSave, invoiceRef }) => {
  const count = items.length;
  const sales = total;
  const credit = 0;
  const cash = total;
  const cheque = 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <h3 className="text-lg font-bold">Sales - {new Date().toISOString().slice(0, 10)}</h3>
        
        <div className="grid grid-cols-5 bg-violet-700/90 text-white text-center py-2 px-1 text-xs rounded-lg">
          <div>
            <div className="text-xs font-bold">Count</div>
            <div className="text-base font-bold">{count}</div>
          </div>
          <div>
            <div className="text-xs font-bold">Sales</div>
            <div className="text-base font-bold">{sales.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-bold">Credit</div>
            <div className="text-base font-bold">{credit.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-bold">Cash</div>
            <div className="text-base font-bold">{cash.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs font-bold">Cheque</div>
            <div className="text-base font-bold">{cheque.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg">
          <div className="text-xs font-bold mb-2">Invoice Items</div>
          <div className="w-full">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-200 border-b-2 border-gray-400">
              <tr>
                <th className="px-1 py-2 text-center font-bold text-gray-700 w-8">No.</th>
                <th className="px-1 py-2 text-left font-bold text-gray-700">Item</th>
                <th className="px-1 py-2 text-right font-bold text-gray-700 w-10">Rate</th>
                <th className="px-1 py-2 text-right font-bold text-gray-700 w-10">Qty</th>
                <th className="px-1 py-2 text-right font-bold text-gray-700 w-12">Amount</th>
                <th className="px-1 py-2 text-center font-bold text-gray-700 w-8">Del</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="px-1 py-2 text-gray-800 text-center w-8">{item.id}</td>
                  <td className="px-1 py-2">
                    <input
                      type="text"
                      className="w-24 px-2 py-1 text-xs font-semibold text-gray-900 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={item.name}
                      placeholder={`Item${item.id}`}
                      onChange={(e) => onNameChange(item.id, e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 w-10">
                    <input
                      type="number"
                      step="0.01"
                      className="w-10 px-1 py-1 text-xs font-semibold text-gray-900 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
                      value={item.rate}
                      onChange={(e) => onRateChange(item.id, e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 w-10">
                    <input
                      type="number"
                      step="0.01"
                      className="w-10 px-1 py-1 text-xs font-semibold text-gray-900 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
                      value={item.qty}
                      onChange={(e) => onQtyChange(item.id, e.target.value)}
                    />
                  </td>
                  <td className="px-1 py-2 text-right text-gray-800 font-semibold text-xs w-12">{item.total.toFixed(2)}</td>
                  <td className="px-1 py-2 text-center w-8">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-800 font-bold text-base hover:bg-red-100 rounded px-1 py-0.5"
                      title="Delete item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-300 bg-gray-50 flex-shrink-0">
        <div className="text-xs font-semibold text-gray-700 mb-3">Total: ₹{total.toFixed(2)}</div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={goBack}
            className="py-2.5 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 text-sm"
          >
            Back
          </button>
          <button
            onClick={onDownloadPDF}
            className="py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm"
          >
            PDF
          </button>
          <button
            onClick={onShareImage}
            className="py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500 text-sm"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

const CalculatorInput = ({ value }) => (
  <div className="h-20 rounded-2xl bg-slate-900 text-white px-4 py-2 text-right text-3xl break-words tracking-wider flex items-center justify-end font-bold">
    {value || "0"}
  </div>
);

export default function App() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState([]);
  const [view, setView] = useState("calculator");
  const [saved, setSaved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("auth") === "true";
  });
  const invoiceRef = useRef(null);

  const grandTotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);

  const handleLogin = (username, password) => {
    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      setIsAuthenticated(true);
      localStorage.setItem("auth", "true");
    } else {
      alert("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("auth");
    setInput("");
    setItems([]);
    setView("calculator");
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleButton = (value) => {
    if (value === "C") {
      setInput("");
      setSaved(false);
      return;
    }
    if (value === "⌫") {
      setInput((prev) => prev.slice(0, -1));
      setSaved(false);
      return;
    }
    if (value === "=") {
      const parsedItems = parseInvoiceItems(input);
      if (!parsedItems.length) {
        alert("Invalid expression. Please use the format 10*24+10*35+10*45");
        return;
      }
      setItems(parsedItems);
      setView("invoice");
      return;
    }
    setInput((prev) => {
      const next = prev + value;
      return next.length > 100 ? prev : next;
    });
    setSaved(false);
  };

  const updateItemName = (id, name) => {
    setItems((prev) =>
      prev.map((itm) => (itm.id === id ? { ...itm, name } : itm))
    );
  };

  const updateItemRate = (id, rate) => {
    const rateNum = parseFloat(rate) || 0;
    setItems((prev) =>
      prev.map((itm) => (itm.id === id ? { ...itm, rate: rateNum, total: itm.qty * rateNum } : itm))
    );
  };

  const updateItemQty = (id, qty) => {
    const qtyNum = parseFloat(qty) || 0;
    setItems((prev) =>
      prev.map((itm) => (itm.id === id ? { ...itm, qty: qtyNum, total: itm.rate * qtyNum } : itm))
    );
  };

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((itm) => itm.id !== id));
  };

  const doShareImage = async () => {
    if (items.length === 0) return;

    try {
      const imageData = generateStyledInvoice(items, grandTotal);
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], "invoice.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Invoice",
          text: `Grand Total: ₹${grandTotal}`,
        });
        return;
      }

      const message = formatWhatsAppMessage(items, grandTotal);
      window.open(`https://wa.me/?text=${message}`, "_blank");
    } catch (error) {
      console.error("Share image failed", error);
      const message = formatWhatsAppMessage(items, grandTotal);
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  const doDownloadPDF = () => {
    if (items.length === 0) return;
    generatePDF(items, grandTotal);
  };

  const doSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-800 flex flex-col">
      <main className="max-w-md mx-auto flex flex-col flex-1 w-full">
        <header className="p-3 pt-4 flex justify-between items-start flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold">Invoice Calc</h1>
            <p className="text-xs text-slate-600 mt-0.5">rate * qty + ...</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-xs"
          >
            Logout
          </button>
        </header>

        {view === "calculator" ? (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
            <CalculatorInput value={input} />
            <div className="flex-1 flex flex-col justify-center">
              <CalculatorButtons onPress={handleButton} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <InvoiceView
              items={items}
              total={grandTotal}
              onNameChange={updateItemName}
              onRateChange={updateItemRate}
              onQtyChange={updateItemQty}
              onDeleteItem={deleteItem}
              onShareImage={doShareImage}
              onDownloadPDF={doDownloadPDF}
              invoiceRef={invoiceRef}
              goBack={() => setView("calculator")}
              onSave={doSave}
            />
          </div>
        )}

        {saved && (
          <div className="fixed bottom-20 inset-x-4 bg-emerald-600 text-white text-center py-2 rounded-xl shadow-lg">
            Saved successfully!
          </div>
        )}
      </main>
    </div>
  );
}
