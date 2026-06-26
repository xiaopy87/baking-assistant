import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import BottomNav from './components/BottomNav';
import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEdit from './pages/RecipeEdit';
import Timer from './pages/Timer';
import Cost from './pages/Cost';
import './styles/globals.css';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/recipe/:id/edit" element={<RecipeEdit />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/cost" element={<Cost />} />
        </Routes>
        <BottomNav />
      </HashRouter>
    </AppProvider>
  );
}
