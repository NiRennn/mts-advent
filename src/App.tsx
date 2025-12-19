import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./App.scss";
import appRoutes from "./routes/routes";
import Onboarding from "./components/Onboarding/Onboarding";
import Game from "./components/Game/Game";


function AppRoutes() {
    const navigate = useNavigate();

  useEffect(() => {
    window.Telegram.WebApp.ready();
    navigate(appRoutes.ONBOARDING, { replace: true });
  }, []);

   return (
    <div className="Page">
      <Routes>
        <Route path={appRoutes.ONBOARDING} element={<Onboarding />} />
        <Route path={appRoutes.GAME} element={<Game />} />

      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter> 
  );
}

export default App;