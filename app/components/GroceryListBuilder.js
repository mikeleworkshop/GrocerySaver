"use client";

import { useState, useRef, useEffect } from "react";

const COMMON_GROCERIES = [
  "Milk", "Bread", "Eggs", "Chicken", "Rice", "Pasta", "Cheese", "Yogurt",
  "Butter", "Apples", "Bananas", "Tomatoes", "Onions", "Potatoes", "Carrots",
  "Lettuce", "Cereal", "Oatmeal", "Juice", "Coffee", "Tea", "Flour", "Sugar",
  "Salt", "Olive oil", "Beans", "Tuna", "Ground beef", "Salmon", "Broccoli",
  "Spinach", "Garlic", "Peppers", "Cucumber", "Avocado", "Oranges", "Strawberries",
  "Frozen vegetables", "Ice cream", "Crackers", "Peanut butter", "Honey", "Vinegar",
];

function getNextId() {
  return String(Date.now()) + Math.random().toString(36).slice(2, 6);
}

export function GroceryListBuilder({ list, onListChange }) {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  const filteredSuggestions = itemName.trim()
    ? COMMON_GROCERIES.filter((name) =>
        name.toLowerCase().includes(itemName.trim().toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addItem(name = itemName.trim()) {
    const n = (name || itemName.trim()).trim();
    if (!n) return;
    const qty = Math.max(1, Math.min(999, Number(quantity) || 1));
    onListChange([
      ...list,
      { id: getNextId(), name: n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(), quantity: qty },
    ]);
    setItemName("");
    setQuantity(1);
    setSuggestionsOpen(false);
    setHighlightedIndex(-1);
  }

  function removeItem(id) {
    onListChange(list.filter((item) => item.id !== id));
  }

  function updateQuantity(id, newQty) {
    const qty = Math.max(1, Math.min(999, Number(newQty) || 1));
    onListChange(list.map((item) => item.id === id ? { ...item, quantity: qty } : item));
  }

  function handleKeyDown(e) {
    if (!suggestionsOpen || filteredSuggestions.length === 0) {
      if (e.key === "Enter") addItem();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => i < filteredSuggestions.length - 1 ? i + 1 : 0);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => i > 0 ? i - 1 : filteredSuggestions.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const name = filteredSuggestions[highlightedIndex] ?? filteredSuggestions[0];
      if (name) addItem(name);
      return;
    }
    if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div>
      {/* Page heading */}
      <div className="mb-4">
        <h1 className="ss-page-title mb-1">
          Your <span className="ss-highlight">grocery list</span>
        </h1>
        <p className="ss-page-sub">Add items and quantities. We'll find the best prices for you.</p>
      </div>

      <div className="row g-4">
        {/* Add item card */}
        <div className="col-lg-6">
          <div className="ss-card h-100">
            <p className="ss-card-title">Add item</p>

            <div className="position-relative ss-field">
              <label htmlFor="grocery-item" className="ss-label">Item name</label>
              <input
                ref={inputRef}
                type="text"
                id="grocery-item"
                className="ss-input"
                placeholder="e.g. Milk, Bread, Eggs…"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setSuggestionsOpen(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              {suggestionsOpen && filteredSuggestions.length > 0 && (
                <ul ref={suggestionsRef} className="ss-suggestions" role="listbox">
                  {filteredSuggestions.map((name, i) => (
                    <li
                      key={name}
                      role="option"
                      aria-selected={i === highlightedIndex}
                      className={`ss-suggestion-item${i === highlightedIndex ? " highlighted" : ""}`}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => addItem(name)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="ss-field">
              <label htmlFor="grocery-qty" className="ss-label">Quantity</label>
              <div className="d-flex gap-2">
                <select
                  id="grocery-qty"
                  className="ss-select"
                  style={{ width: "90px", flexShrink: 0 }}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-ss-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => addItem()}
                >
                  + Add to list
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Output preview card */}
        <div className="col-lg-6">
          <div className="ss-card h-100">
            <p className="ss-card-title">Preview (for pricing engine)</p>
            <div className="ss-output-box">
              {list.length === 0 ? (
                <span style={{ opacity: 0.5 }}>
                  Your list will appear here as: <code>Milk x1</code>, <code>Eggs x2</code>…
                </span>
              ) : (
                list.map((item) => (
                  <div key={item.id} className="ss-output-item">
                    {item.name} x{item.quantity}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full list */}
      {list.length > 0 && (
        <div className="ss-card mt-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <p className="ss-card-title mb-0">Your items</p>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--ss-primary)",
                background: "var(--ss-primary-soft)",
                borderRadius: "999px",
                padding: "0.2rem 0.65rem",
              }}
            >
              {list.length} item{list.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div>
            {list.map((item) => (
              <div key={item.id} className="ss-list-item">
                <span className="ss-item-name">{item.name}</span>
                <div className="d-flex align-items-center gap-2">
                  <select
                    className="ss-select sm"
                    style={{ width: "72px" }}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                    aria-label={`Quantity for ${item.name}`}
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ss-danger"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
