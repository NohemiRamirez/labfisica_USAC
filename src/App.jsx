import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import HomePage from './modules/home/HomePage'
import DataTablePage from './modules/dataTable/DataTablePage'
import GraphAnalysisPage from './modules/graphAnalysis/GraphAnalysisPage'
import ReportsPage from './modules/reports/ReportsPage'
import LaboratoriesPage from './modules/laboratories/LaboratoriesPage'

function App() {
  const location = useLocation()

  return (
    <>
      <Navbar />
      <div className="page-content">
        <div key={location.pathname} className="page-fade">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/data-table" element={<DataTablePage />} />
            <Route path="/graph-analysis" element={<GraphAnalysisPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/laboratories" element={<LaboratoriesPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

export default App