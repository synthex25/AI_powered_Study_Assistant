import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './store/store';
import { LoginPage, ProtectedRoute } from './components/auth';
import { StudyPlayground } from './components/dashboard';
import { LandingPage } from './components/landing';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            {/* Login redirects to landing page with auth modal open */}
            <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<StudyPlayground />} />
              <Route path="/workspace/:id" element={<StudyPlayground />} />
            </Route>

            {/* Redirect unmatched routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </PersistGate>
    </Provider>
  );
}

export default App;
