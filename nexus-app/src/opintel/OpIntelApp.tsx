import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import App from "./app/App";
import { useAppAccess } from "@/lib/appAccess";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";

const BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/opintel-api`;

/**
 * The original app talks to same-origin `/__tvb/*` bridges. Route exactly those
 * calls to the staff-only backend with the signed-in session; everything else
 * goes through the browser's normal fetch.
 */
let installed = false;
function installBridgeFetch() {
  if (installed) return;
  installed = true;
  const native = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (typeof url === "string" && url.startsWith("/__tvb/")) {
      const { data } = await supabase.auth.getSession();
      const headers = new Headers(init?.headers);
      headers.set("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
      return native(`${BASE}/${url.slice("/__tvb/".length)}`, { ...init, headers });
    }
    return native(input, init);
  };
}

export default function OpIntelApp() {
  const { loading, session, level } = useAppAccess("opintel");

  useEffect(() => {
    document.title = "Opportunity Intelligence — TVB Nexus";
    installBridgeFetch();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh" }} />;
  if (!session || !level) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Opportunity Intelligence</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>
            {session
              ? "Your account doesn't have access. Ask a TVB admin to give you access to Opportunity Intelligence."
              : "Sign in with your TVB staff account to continue."}
          </p>
          {!session && (
            <a href="/auth?redirect=/opintel" className="btn btn--primary" style={{ display: "inline-block", marginTop: 20 }}>
              Sign in
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <BrowserRouter basename="/opintel">
      <App />
    </BrowserRouter>
  );
}
