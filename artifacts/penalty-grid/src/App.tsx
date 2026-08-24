import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { GameProvider } from '@/lib/game-state';
import Lobby from '@/pages/lobby';
import Room from '@/pages/room';
import Game from '@/pages/game';
import Results from '@/pages/results';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <GameProvider>
        <Switch>
          <Route path="/" component={Lobby} />
          <Route path="/room/:code" component={Room} />
          <Route path="/game/:code" component={Game} />
          <Route path="/results/:code" component={Results} />
          <Route component={NotFound} />
        </Switch>
      </GameProvider>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
