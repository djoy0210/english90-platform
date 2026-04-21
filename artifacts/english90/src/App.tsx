import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Lessons from "./pages/lessons";
import LessonView from "./pages/lesson-view";
import History from "./pages/history";
import FinalTestView from "./pages/final-test-view";
import Billing from "./pages/billing";
import Admin from "./pages/admin";
import Account from "./pages/account";
import PlacementTest from "./pages/placement-test";
import NotFound from "./pages/not-found";
import Layout from "./components/layout";
import { useGetMe } from "@workspace/api-client-react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(224, 76%, 25%)",
    colorBackground: "hsl(210, 40%, 98%)",
    colorInputBackground: "hsl(0, 0%, 100%)",
    colorText: "hsl(222, 47%, 11%)",
    colorTextSecondary: "hsl(215.4, 16.3%, 46.9%)",
    colorInputText: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214.3, 31.8%, 91.4%)",
    borderRadius: "0.75rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-lg border border-[hsl(214.3,31.8%,91.4%)] rounded-2xl w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none bg-[hsl(210,40%,96%)] border-t border-[hsl(214.3,31.8%,91.4%)]",
    headerTitle: { color: "hsl(222, 47%, 11%)" },
    headerSubtitle: { color: "hsl(215.4, 16.3%, 46.9%)" },
    socialButtonsBlockButtonText: { color: "hsl(222, 47%, 11%)" },
    formFieldLabel: { color: "hsl(222, 47%, 11%)" },
    footerActionLink: { color: "hsl(224, 76%, 25%)" },
    footerActionText: { color: "hsl(215.4, 16.3%, 46.9%)" },
    dividerText: { color: "hsl(215.4, 16.3%, 46.9%)" },
    formFieldSuccessText: { color: "hsl(142.1, 76.2%, 36.3%)" },
    alertText: { color: "hsl(0, 84.2%, 60.2%)" },
    formButtonPrimary: "bg-[hsl(224,76%,25%)] hover:bg-[hsl(224,76%,20%)] text-white shadow-sm",
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-8">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-8">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  return (
    <>
      <Show when="signed-in">
        <ProtectedContent component={Component} adminOnly={adminOnly} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ProtectedContent({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">Уншиж байна...</div>
      </Layout>
    );
  }

  if (adminOnly && user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  if (user && user.role !== "admin" && !user.placementCompleted && location !== "/placement") {
    return <Redirect to="/placement" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [, setLocation] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProvider
            publishableKey={clerkPubKey}
            proxyUrl={clerkProxyUrl}
            appearance={clerkAppearance}
            localization={{
              signIn: {
                start: {
                  title: "Welcome back",
                  subtitle: "Continue your 90-day journey",
                },
              },
              signUp: {
                start: {
                  title: "Start your journey",
                  subtitle: "Commit to 90 days of English",
                },
              },
            }}
            routerPush={(to) => setLocation(stripBase(to))}
            routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
          >
            <ClerkQueryClientCacheInvalidator />
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              
              <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/placement" component={() => <ProtectedRoute component={PlacementTest} />} />
              <Route path="/lessons" component={() => <ProtectedRoute component={Lessons} />} />
              <Route path="/lessons/:lessonId" component={() => <ProtectedRoute component={LessonView} />} />
              <Route path="/final-tests/:level" component={() => <ProtectedRoute component={FinalTestView} />} />
              <Route path="/history" component={() => <ProtectedRoute component={History} />} />
              <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
              <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
              <Route path="/admin" component={() => <ProtectedRoute component={Admin} adminOnly />} />
              
              <Route component={NotFound} />
            </Switch>
          </ClerkProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;