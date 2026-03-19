"use client";
import { useState } from "react";

const DISH_SUGGESTIONS = [
  "Spaghetti Bolognese", "Chicken Fried Rice", "Beef Stir Fry",
  "Vegetable Curry", "Pasta Carbonara", "Chicken Soup",
  "Tacos", "Omelette", "Pancakes", "Greek Salad",
];

// Instant cache for common dishes — avoids API call entirely
const DISH_CACHE = {
  "spaghetti bolognese": [
    { name: "Pasta", quantity: 1, unit: "pack", budget_tip: "Home brand ~$1.20 at Aldi" },
    { name: "Ground beef", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Tomatoes", quantity: 2, unit: "units", budget_tip: null },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
    { name: "Olive oil", quantity: 1, unit: "bottle", budget_tip: null },
    { name: "Cheese", quantity: 1, unit: "pack", budget_tip: "Optional — skip to save" },
  ],
  "chicken fried rice": [
    { name: "Rice", quantity: 1, unit: "pack", budget_tip: "Aldi rice is cheapest" },
    { name: "Chicken", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Eggs", quantity: 2, unit: "units", budget_tip: null },
    { name: "Frozen vegetables", quantity: 1, unit: "bag", budget_tip: "Frozen is cheaper than fresh" },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
  ],
  "beef stir fry": [
    { name: "Ground beef", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Broccoli", quantity: 1, unit: "head", budget_tip: null },
    { name: "Carrots", quantity: 2, unit: "units", budget_tip: null },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
    { name: "Rice", quantity: 1, unit: "pack", budget_tip: "Serve over rice" },
    { name: "Olive oil", quantity: 1, unit: "bottle", budget_tip: null },
  ],
  "vegetable curry": [
    { name: "Potatoes", quantity: 2, unit: "units", budget_tip: null },
    { name: "Carrots", quantity: 2, unit: "units", budget_tip: null },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
    { name: "Tomatoes", quantity: 2, unit: "units", budget_tip: null },
    { name: "Spinach", quantity: 1, unit: "bag", budget_tip: null },
    { name: "Rice", quantity: 1, unit: "pack", budget_tip: "Serve over rice" },
  ],
  "pasta carbonara": [
    { name: "Pasta", quantity: 1, unit: "pack", budget_tip: "Home brand ~$1.20" },
    { name: "Eggs", quantity: 3, unit: "units", budget_tip: null },
    { name: "Cheese", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Butter", quantity: 1, unit: "pack", budget_tip: null },
  ],
  "chicken soup": [
    { name: "Chicken", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Carrots", quantity: 2, unit: "units", budget_tip: null },
    { name: "Potatoes", quantity: 2, unit: "units", budget_tip: null },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
    { name: "Spinach", quantity: 1, unit: "bag", budget_tip: null },
  ],
  "tacos": [
    { name: "Ground beef", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Tomatoes", quantity: 2, unit: "units", budget_tip: null },
    { name: "Lettuce", quantity: 1, unit: "head", budget_tip: null },
    { name: "Cheese", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
  ],
  "omelette": [
    { name: "Eggs", quantity: 3, unit: "units", budget_tip: "Cheapest protein per serve" },
    { name: "Cheese", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Butter", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Spinach", quantity: 1, unit: "bag", budget_tip: null },
    { name: "Tomatoes", quantity: 1, unit: "unit", budget_tip: null },
  ],
  "pancakes": [
    { name: "Flour", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Eggs", quantity: 2, unit: "units", budget_tip: null },
    { name: "Milk", quantity: 1, unit: "bottle", budget_tip: null },
    { name: "Butter", quantity: 1, unit: "pack", budget_tip: null },
    { name: "Sugar", quantity: 1, unit: "pack", budget_tip: null },
  ],
  "greek salad": [
    { name: "Tomatoes", quantity: 3, unit: "units", budget_tip: null },
    { name: "Lettuce", quantity: 1, unit: "head", budget_tip: null },
    { name: "Cheese", quantity: 1, unit: "pack", budget_tip: "Use feta if available" },
    { name: "Onions", quantity: 1, unit: "unit", budget_tip: null },
    { name: "Olive oil", quantity: 1, unit: "bottle", budget_tip: null },
  ],
};

export default function DishRecommender({ groceryList = [], onAddIngredients }) {
  const [dish, setDish] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // Autocomplete filter
  function handleInput(value) {
    setDish(value);
    setResults(null);
    if (value.length > 1) {
      setSuggestions(
        DISH_SUGGESTIONS.filter((d) =>
          d.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setSuggestions([]);
    }
  }

  async function handleRecommend() {
    if (!dish.trim()) return;
    setError(null);
    setResults(null);
    setSuggestions([]);

    // Instant cache hit — no API call needed
    const cacheKey = dish.trim().toLowerCase();
    if (DISH_CACHE[cacheKey]) {
      const ingredients = DISH_CACHE[cacheKey];
      setResults(ingredients);
      setSelected(new Set(ingredients.map((_, i) => i)));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, groceryList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.ingredients);
      setSelected(new Set(data.ingredients.map((_, i) => i)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(index) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function handleAddToList() {
    if (!results) return;
    const toAdd = results
      .filter((_, i) => selected.has(i))
      .map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }));
    onAddIngredients(toAdd);
    setResults(null);
    setDish("");
    setSelected(new Set());
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">
          🤖 AI Dish Recommender
        </h5>
        <p className="text-muted small mb-3">
          Enter a dish and the AI will suggest the ingredients you need.
        </p>

        {/* Input + button */}
        <div className="position-relative mb-3">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Spaghetti Bolognese..."
              value={dish}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecommend()}
            />
            <button
              className="btn btn-primary"
              onClick={handleRecommend}
              disabled={loading || !dish.trim()}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : "Get Ingredients"}
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <ul className="list-group position-absolute w-100 shadow-sm"
                style={{ zIndex: 100, top: "100%", left: 0 }}>
              {suggestions.map((s) => (
                <li key={s}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: "pointer" }}
                    onClick={() => { setDish(s); setSuggestions([]); }}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger py-2 small">{error}</div>
        )}

        {/* Results */}
        {results && (
          <div>
            <p className="small fw-semibold mb-2">
              Suggested ingredients for <em>{dish}</em>:
            </p>
            <ul className="list-group mb-3">
              {results.map((ing, i) => (
                <li key={i}
                    className={`list-group-item d-flex justify-content-between align-items-start ${
                      selected.has(i) ? "" : "text-muted"
                    }`}>
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      id={`ing-${i}`}
                    />
                    <label className="form-check-label ms-1" htmlFor={`ing-${i}`}>
                      <span className="fw-medium">{ing.name}</span>
                      <span className="text-muted ms-2 small">
                        {ing.quantity} {ing.unit}
                      </span>
                    </label>
                  </div>
                  {ing.budget_tip && (
                    <span className="badge bg-success-subtle text-success-emphasis small">
                      💡 {ing.budget_tip}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="d-flex gap-2">
              <button
                className="btn btn-success btn-sm"
                onClick={handleAddToList}
                disabled={selected.size === 0}
              >
                Add {selected.size} item{selected.size !== 1 ? "s" : ""} to list
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setResults(null)}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}