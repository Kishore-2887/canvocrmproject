import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import styles from './AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
