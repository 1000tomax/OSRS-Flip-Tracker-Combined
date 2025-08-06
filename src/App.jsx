// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Items from './pages/Items';
import FlipLogs from './pages/FlipLogs'; // ✅ Add this line


function App() {
  return (
    <Router>      
		<Routes>
		  <Route path="/" element={<Home />} />
		  <Route path="/items" element={<Items />} />
		  <Route path="/flip-logs" element={<FlipLogs />} /> {/* ✅ NEW */}
		</Routes>
    </Router>
  );
}

export default App;
