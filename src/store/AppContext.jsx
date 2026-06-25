import { useState, useEffect, createContext, useContext } from 'react';
import { INITIAL_ING_LIB, INITIAL_RECIPES } from '../data/initialData';

const AppContext = createContext(null);

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function AppProvider({ children }) {
  const [ingLib, setIngLib] = useState(() => load('ingLib', INITIAL_ING_LIB));
  const [recipes, setRecipes] = useState(() => load('recipes', INITIAL_RECIPES));
  const [portions, setPortions] = useState({});

  useEffect(() => { save('ingLib', ingLib); }, [ingLib]);
  useEffect(() => { save('recipes', recipes); }, [recipes]);

  // ── cost helpers ──
  function unitPrice(ingId) {
    const ing = ingLib[ingId];
    return ing ? ing.price / ing.qty : 0;
  }

  function recipeCost(recipe, portion) {
    const base = recipe.portion;
    const ratio = portion / base;
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

  // ── ingredient lib ──
  function saveIng(id, data) {
    setIngLib(prev => ({ ...prev, [id]: data }));
  }

  function deleteIng(id) {
    setIngLib(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  // ── recipes ──
  function saveRecipe(recipe) {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recipe;
        return next;
      }
      return [...prev, recipe];
    });
  }

  function deleteRecipe(id) {
    setRecipes(prev => prev.filter(r => r.id !== id));
  }

  return (
    <AppContext.Provider value={{
      ingLib, recipes,
      unitPrice, recipeCost, getPortion, setPortion,
      saveIng, deleteIng,
      saveRecipe, deleteRecipe,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
