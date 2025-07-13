import { r as reactExports, A as AppState, j as jsxRuntimeExports, a as createRoot } from "../../supabase-client.js";
import { A as AuthService } from "../../AuthService.js";
import "../../config.js";
const AuthApp = () => {
  const [isSignUp, setIsSignUp] = reactExports.useState(false);
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [message, setMessage] = reactExports.useState("");
  const [messageType, setMessageType] = reactExports.useState("error");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [isInitialized, setIsInitialized] = reactExports.useState(false);
  const [services] = reactExports.useState(() => {
    const state = new AppState();
    return {
      state,
      auth: new AuthService(state)
    };
  });
  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5e3);
  };
  const getErrorMessage = (error) => {
    if (error.message.includes("Invalid login credentials")) return "Invalid email or password";
    if (error.message.includes("User already registered")) return "An account with this email already exists";
    if (error.message.includes("Email not confirmed")) return "Please check your email and click the confirmation link";
    return error.message || "Authentication failed";
  };
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail("");
    setPassword("");
    setMessage("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return showMessage("Please fill in all fields", "error");
    }
    if (password.length < 6) {
      return showMessage("Password must be at least 6 characters", "error");
    }
    setIsLoading(true);
    try {
      const { data, error } = isSignUp ? await services.state.supabase.auth.signUp({ email, password }) : await services.state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (isSignUp) {
        showMessage(data.session ? "Account created successfully!" : "Please check your email for verification link", "success");
      } else if (data.session) {
        showMessage("Signed in successfully!", "success");
      }
      if (data.session) {
        setTimeout(() => window.close(), 1500);
      }
    } catch (error) {
      console.error("Auth error:", error);
      const errorMessage = getErrorMessage(error);
      showMessage(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };
  reactExports.useEffect(() => {
    const initialize = async () => {
      try {
        await services.auth.initializeSupabase();
        const { data: { session } } = await services.state.supabase.auth.getSession();
        if (session) {
          showMessage("Already signed in!", "success");
          setTimeout(() => window.close(), 1e3);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Initialization error:", error);
        showMessage("Authentication system not available", "error");
        setIsInitialized(true);
      }
    };
    initialize();
  }, [services.auth, services.state]);
  if (!isInitialized) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-container", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "POKÉBROWSER" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Trainer Authentication System" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "20px" }, children: "Loading..." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "POKÉBROWSER" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Trainer Authentication System" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", children: "Trainer Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "email",
            id: "email",
            placeholder: "trainer@pokemon.com",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            id: "password",
            placeholder: "Enter your password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "submit",
          className: "btn",
          disabled: isLoading,
          children: isSignUp ? "Sign Up" : "Sign In"
        }
      ),
      message && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "message", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `message ${messageType}`, children: message }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isSignUp ? "Already have an account?" : "Don't have an account?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "toggle-link", onClick: toggleAuthMode, children: isSignUp ? "Sign in" : "Sign up" })
      ] })
    ] }) }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "loading-screen", id: "loading", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spinner" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Authenticating..." })
    ] })
  ] });
};
const container = document.getElementById("auth-root");
const root = createRoot(container);
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(AuthApp, {}));
//# sourceMappingURL=auth.js.map
