import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/contexts/query-context";
import DatabaseStudio from "@/pages/database-studio";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DatabaseStudio} />
      <Route path="/studio" component={DatabaseStudio} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryProvider>
    </QueryClientProvider>
  );
}

export default App;
