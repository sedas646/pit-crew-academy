import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import RaceEngineer from './components/roles/RaceEngineer';
import AeroEngineer from './components/roles/AeroEngineer';
import DataAnalyst from './components/roles/DataAnalyst';
import StrategyEngineer from './components/roles/StrategyEngineer';
import PowertrainEngineer from './components/roles/PowertrainEngineer';
import CarBuilder from './components/roles/CarBuilder';
import RaceWeekend from './components/roles/RaceWeekend';
import Achievements from './components/pages/Achievements';
import Learn from './components/pages/Learn';
import PitStopGames from './components/roles/PitStopGames';
import InstallPrompt from './components/shared/InstallPrompt';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="race-engineer" element={<RaceEngineer />} />
            <Route path="aero-engineer" element={<AeroEngineer />} />
            <Route path="data-analyst" element={<DataAnalyst />} />
            <Route path="strategy-engineer" element={<StrategyEngineer />} />
            <Route path="powertrain-engineer" element={<PowertrainEngineer />} />
            <Route path="car-builder" element={<CarBuilder />} />
            <Route path="race-weekend" element={<RaceWeekend />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="learn" element={<Learn />} />
            <Route path="pit-stop-games" element={<PitStopGames />} />
          </Route>
        </Routes>
        <InstallPrompt />
      </HashRouter>
    </AppProvider>
  );
}
