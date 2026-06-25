import { useNavigate, useLocation } from 'react-router-dom';
import styles from './BottomNav.module.css';

const TABS = [
  { path: '/',       icon: '📖', label: '食谱' },
  { path: '/cost',   icon: '💰', label: '成本' },
  { path: '/timer',  icon: '⏱',  label: '计时' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className={styles.nav}>
      {TABS.map(tab => {
        const active = location.pathname === tab.path ||
          (tab.path !== '/' && location.pathname.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
