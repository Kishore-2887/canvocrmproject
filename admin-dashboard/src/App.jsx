import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SearchProvider } from './context/SearchContext.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import Employees  from './pages/Employees.jsx';
import Leads      from './pages/Leads.jsx';
import Settings   from './pages/Settings.jsx';
import AppLayout  from './components/AppLayout.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="leads" element={<Leads />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}
