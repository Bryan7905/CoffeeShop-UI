import React, { useState, useMemo } from "react";
import api from "../api"; // expects src/api.js (the api client) — adjust path if different
import "../App.css";

export default function OrderPage({
  navigate,
  customers = [],
  setCustomers,
  transactions = [],
  setTransactions,
}) {
  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers.length ? String(customers[0].id) : "new"
  );
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerContact, setNewCustomerContact] = useState("");

  const [items, setItems] = useState([
    { name: "Latte", qty: 1, price: 5 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Derived totals
  const totals = useMemo(() => {
    const total = items
      .map((it) => {
        const qty = Number(it.qty) || 0;
        const price = Number(it.price) || 0;
        return price * qty;
      })
      .reduce((a, b) => a + b, 0);
    const disc = Number(discount) || 0;
    const finalTotal = Math.max(0, total - disc);
    return { total, discount: disc, finalTotal };
  }, [items, discount]);

  // Item handlers
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it, [field]: value } : it));
      return next;
    });
  };

  const handleAddItem = () =>
    setItems((prev) => [...prev, { name: "", qty: 1, price: 0 }]);

  const handleRemoveItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  // Create customer (if needed) and transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      let customerId = null;

      // If user selected "new" create a customer first
      if (selectedCustomerId === "new") {
        if (!newCustomerName.trim()) {
          throw new Error("New customer name is required");
        }
        // Create customer on backend
        const created = await api.createCustomer({
          name: newCustomerName.trim(),
          contact: newCustomerContact.trim(),
        });
        // update UI list
        setCustomers((prev) => (Array.isArray(prev) ? [...prev, created] : [created]));
        customerId = created.id;
      } else {
        customerId = Number(selectedCustomerId);
      }

      // Build transaction request
      const itemsPayload = items
        .filter((it) => it && (it.name || Number(it.qty) || Number(it.price)))
        .map((it) => ({
          name: it.name || "",
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
        }));

      if (!itemsPayload.length) {
        throw new Error("Add at least one item to the order");
      }

      const txnReq = {
        customerId,
        items: itemsPayload,
        discount: Number(discount) || 0,
      };

      // Persist transaction
      const savedTxn = await api.createTransaction(txnReq);

      // Update UI transactions list
      setTransactions((prev) => (Array.isArray(prev) ? [...prev, savedTxn] : [savedTxn]));

      // clear form (keep customers)
      setItems([{ name: "Latte", qty: 1, price: 5 }]);
      setDiscount(0);
      setNewCustomerName("");
      setNewCustomerContact("");
      setSelectedCustomerId(String(customerId));

      // Optionally navigate back to home or customers list
      navigate("home");
    } catch (err) {
      console.error("Failed to create transaction:", err);
      setError(err.message || "Failed to create transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="order-page">
      <h2>Create Order</h2>

      <form onSubmit={handleSubmit} className="order-form">
        <section>
          <label>Customer</label>
          <div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="new">-- New Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} {c.contact ? `(${c.contact})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomerId === "new" && (
            <div className="new-customer">
              <input
                type="text"
                placeholder="Name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Contact (email or phone)"
                value={newCustomerContact}
                onChange={(e) => setNewCustomerContact(e.target.value)}
              />
            </div>
          )}
        </section>

        <section>
          <label>Items</label>
          <div className="items-list">
            {items.map((item, idx) => (
              <div key={idx} className="order-item">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                  style={{ width: 80 }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                  style={{ width: 100 }}
                />
                <button type="button" onClick={() => handleRemoveItem(idx)}>
                  Remove
                </button>
              </div>
            ))}

            <div>
              <button type="button" onClick={handleAddItem}>
                + Add Item
              </button>
            </div>
          </div>
        </section>

        <section>
          <label>Discount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </section>

        <section className="totals">
          <div>Total: ${totals.total.toFixed(2)}</div>
          <div>Discount: ${totals.discount.toFixed(2)}</div>
          <div>
            <strong>Final Total: ${totals.finalTotal.toFixed(2)}</strong>
          </div>
        </section>

        {error && <div className="error">{error}</div>}

        <div className="actions">
          <button type="button" onClick={() => navigate("home")} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}