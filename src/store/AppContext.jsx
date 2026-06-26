import { useState, useEffect, createContext, useContext } from 'react';

const AppContext = createContext(null);

const API = import.meta.env.VITE_API_URL || 'https://baking-assistant-api.xiaopy87.workers.dev';

async function apiFetch(path, options) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function AppProvider({ children }) {
  const [ingLib, setIngLib] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [portions, setPortions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/recipes'),
      apiFetch('/api/ing-lib'),
    ]).then(([r, lib]) => {
      setRecipes(r);
      setIngLib(lib);
    }).finally(() => setLoading(false));
  }, []);

  function unitPrice(ingId) {
    const ing = ingLib[ingId];
    return ing ? ing.price / ing.qty : 0;
  }

  function recipeCost(recipe, portion) {
    const ratio = portion / recipe.portion;
    let total = 0;
    recipe.ingGroups.forEach(g =>
      g.ings.forEach(ing => {
        const amt = ing.unit === 'pcs' ? ing.amount : ing.amount * ratio;
        total += unitPrice(ing.ingId) * amt;
      })
    );
    return total;
  }

  function getPortion(recipeId, basePortion) {
    return portions[recipeId] ?? basePortion;
  }

  function setPortion(recipeId, val) {
    setPortions(p => ({ ...p, [recipeId]: Math.max(1, val) }));
  }

  async function saveIng(id, data) {
    await apiFetch('/api/ing-lib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    setIngLib(prev => ({ ...prev, [id]: data }));
  }

  async function deleteIng(id) {
    await apiFetch(`/api/ing-lib/${id}`, { method: 'DELETE' });
    setIngLib(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function saveRecipe(recipe) {
    const exists = recipes.find(r => r.id === recipe.id);
    await apiFetch(exists ? `/api/recipes/${recipe.id}` : '/api/recipes', {
      method: exists ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = recipe; return next; }
      return [...prev, recipe];
    });
  }

  async function deleteRecipe(id) {
    await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' });
    setRecipes(prev => prev.filter(r => r.id !== id));
  }

  return (
    <AppContext.Provider value={{
      ingLib, recipes, loading,
      unitPrice, recipeCost, getPortion, setPortion,
      saveIng, deleteIng, saveRecipe, deleteRecipe,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
