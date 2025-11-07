/**
 * Simple API client for the Coffee Shop POS backend.
 *
 * Usage:
 *   import api from "./api.js";
 *   api.setBaseUrl("http://localhost:8080");
 *   await api.listCustomers();
 *
 * The client uses fetch + async/await and throws on non-2xx responses.
 * You can optionally set an auth token with setAuthToken(token).
 */

const DEFAULT_TIMEOUT_MS = 15000; // 15s

function defaultHeaders(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function handleResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (response.ok) {
    if (response.status === 204) return null;
    return isJson ? response.json() : response.text();
  }
  // Error handling: try to parse body for useful message
  let bodyText;
  try {
    bodyText = isJson ? await response.json() : await response.text();
  } catch (e) {
    bodyText = await response.text().catch(() => "");
  }
  const message =
    (bodyText && typeof bodyText === "object" && bodyText.message) ||
    (typeof bodyText === "string" && bodyText) ||
    `HTTP ${response.status} ${response.statusText}`;
  const err = new Error(message);
  err.status = response.status;
  err.body = bodyText;
  throw err;
}

function withTimeout(fetchPromise, ms = DEFAULT_TIMEOUT_MS) {
  // If no timeout specified, return the original promise
  if (ms == null) return fetchPromise;

  // We can't reliably abort a fetch here unless the fetch was created with
  // an AbortController.signal. Many callers create the fetch before passing
  // it into withTimeout, so instead we implement a timeout that rejects
  // after `ms` ms and race it against the provided promise. This avoids
  // attempting to abort an already-started fetch but still gives callers a
  // timely rejection on slow requests.
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });

  return Promise.race([fetchPromise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const createClient = (initialBaseUrl = "/") => {
  let baseUrl = initialBaseUrl.replace(/\/+$/, ""); // trim trailing slash
  let authToken = null;
  let timeout = DEFAULT_TIMEOUT_MS;

  const setBaseUrl = (url) => {
    baseUrl = url.replace(/\/+$/, "");
  };
  const getBaseUrl = () => baseUrl;

  const setAuthToken = (token) => {
    authToken = token;
  };
  const clearAuthToken = () => {
    authToken = null;
  };

  const setTimeoutMs = (ms) => {
    timeout = ms;
  };

  // Customers
  const listCustomers = async () => {
    const res = await withTimeout(fetch(`${baseUrl}/api/customers`, {
      method: "GET",
      headers: defaultHeaders(authToken),
    }), timeout);
    return handleResponse(res);
  };

  const getCustomer = async (id) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/customers/${id}`, {
      method: "GET",
      headers: defaultHeaders(authToken),
    }), timeout);
    return handleResponse(res);
  };

  const createCustomer = async (customer) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/customers`, {
      method: "POST",
      headers: defaultHeaders(authToken),
      body: JSON.stringify(customer),
    }), timeout);
    return handleResponse(res);
  };

  const updateCustomer = async (id, customer) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/customers/${id}`, {
      method: "PUT",
      headers: defaultHeaders(authToken),
      body: JSON.stringify(customer),
    }), timeout);
    return handleResponse(res);
  };

  const deleteCustomer = async (id) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/customers/${id}`, {
      method: "DELETE",
      headers: defaultHeaders(authToken),
    }), timeout);
    return handleResponse(res);
  };

  // Transactions
  const listTransactions = async () => {
    const res = await withTimeout(fetch(`${baseUrl}/api/transactions`, {
      method: "GET",
      headers: defaultHeaders(authToken),
    }), timeout);
    return handleResponse(res);
  };

  const getTransaction = async (id) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/transactions/${id}`, {
      method: "GET",
      headers: defaultHeaders(authToken),
    }), timeout);
    return handleResponse(res);
  };

  /**
   * Create transaction expects a body shaped like:
   * {
   *   customerId: 1,
   *   items: [{ name: "Latte", qty: 1, price: 5 }],
   *   discount: 0.5
   * }
   */
  const createTransaction = async (transactionRequest) => {
    const res = await withTimeout(fetch(`${baseUrl}/api/transactions`, {
      method: "POST",
      headers: defaultHeaders(authToken),
      body: JSON.stringify(transactionRequest),
    }), timeout);
    return handleResponse(res);
  };

  // Utility: safe parse for numbers from inputs (not required, but handy)
  const parseId = (maybeId) => {
    if (maybeId == null) return null;
    const n = Number(maybeId);
    return Number.isNaN(n) ? maybeId : n;
  };

  return {
    // config
    setBaseUrl,
    getBaseUrl,
    setAuthToken,
    clearAuthToken,
    setTimeoutMs,
    // customer APIs
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    // transaction APIs
    listTransactions,
    getTransaction,
    createTransaction,
    parseId,
  };
};

// default client instance - you can override baseUrl later with api.setBaseUrl(...)
const api = createClient(window && window.__API_BASE_URL ? window.__API_BASE_URL : "http://localhost:8080");

export default api;
export { createClient };