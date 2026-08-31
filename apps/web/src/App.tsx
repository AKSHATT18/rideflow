
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Placeholder routes for future implementation */}
        <Route path="/login" element={<div className="p-8 text-center">Login (Coming in Phase 2)</div>} />
        <Route path="/register" element={<div className="p-8 text-center">Register (Coming in Phase 2)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
