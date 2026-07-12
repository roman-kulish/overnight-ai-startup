import { BrowserRouter, Routes, Route } from 'react-router'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Meditate from './pages/Meditate'
import Agency from './pages/Agency'
import Roast from './pages/Roast'
import Oracle from './pages/Oracle'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meditate" element={<Meditate />} />
          <Route path="/agency" element={<Agency />} />
          <Route path="/roast" element={<Roast />} />
          <Route path="/oracle" element={<Oracle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
