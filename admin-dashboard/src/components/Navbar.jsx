import { useLocation } from 'react-router-dom';
import { useSearch } from '../context/SearchContext.jsx';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { pathname } = useLocation();
  const { searchTerm, setSearchTerm } = useSearch();

  return (
    <header className={styles.navbar}>
      <div className={styles.searchWrap}>
        <span className="uic uic-search" style={{ fontSize: 16, color: '#9ca3af' }}></span>
        <input
          className={styles.searchInput}
          placeholder="Search here..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </header>
  );
}
