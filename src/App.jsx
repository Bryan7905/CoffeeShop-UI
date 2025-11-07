import React, { useEffect, useState } from 'react';
import HomePage from "./pages/HomePage.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import CustomerListPage from "./pages/CustomerListPage.jsx";
import api from "./api";
import './App.css'; // For the color theme

export default function App() {
  const [page, setPage] = useState('home');
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nextCustomerId, setNextCustomerId] = useState(1);
  const [nextTransactionId, setNextTransactionId] = useState(1);
  const [loading, setLoading] = useState(true);

  const navigate = (destination) => setPage(destination);

  // Configure API base URL from environment or a global variable before loading data
  useEffect(() => {
    const envUrl =
      (typeof process !== 'undefined' &&
        process.env &&
        (process.env.VITE_API_BASE_URL || process.env.REACT_APP_API_URL)) ||
      window.__API_BASE_URL;
    if (envUrl) {
      try {
        api.setBaseUrl(envUrl);
        // eslint-disable-next-line no-console
        console.log('API base URL set to', envUrl);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to set API base URL', e);
      }
    }
  }, []);

  // Load customers and transactions from backend on mount
  useEffect(() => {
    let mounted = true;
    async function loadFromApi() {
      setLoading(true);
      try {
        if (api && typeof api.listCustomers === 'function') {
          const cs = await api.listCustomers();
          if (!mounted) return;
          setCustomers(Array.isArray(cs) ? cs : []);
          const maxCusId = cs && cs.length ? Math.max(...cs.map(c => c.id || 0)) : 0;
          setNextCustomerId(maxCusId + 1);
        }
        if (api && typeof api.listTransactions === 'function') {
          const txs = await api.listTransactions();
          if (!mounted) return;
          setTransactions(Array.isArray(txs) ? txs : []);
          const maxTxnId = txs && txs.length ? Math.max(...txs.map(t => t.id || 0)) : 0;
          setNextTransactionId(maxTxnId + 1);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load initial data from API; starting with empty lists.', err);
        // leave arrays empty
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFromApi();
    return () => { mounted = false; };
  }, []);

  // wrapper: create customer through API and update local UI state
  const createCustomer = async (payload) => {
    if (api && typeof api.createCustomer === 'function') {
      try {
        const saved = await api.createCustomer(payload);
        // prefer server's object (and id) if returned
        if (saved && saved.id != null) {
          setCustomers(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
          setNextCustomerId(prev => Math.max(prev, saved.id + 1));
          return saved;
        }
        // if server returned unexpected shape, fall back to deterministic local id
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('createCustomer API call failed, falling back to local creation', err);
        // continue to local fallback below
      }
    }
    // local fallback (should only happen if API not available or failed)
    const newId = nextCustomerId;
    const newCust = { id: newId, name: payload.name, contact: payload.contact, transactions: 0 };
    setCustomers(prev => [...prev, newCust]);
    setNextCustomerId(prev => prev + 1);
    return newCust;
  };

  // wrapper: create transaction through API and update local UI state
  const createTransaction = async (payload) => {
    if (api && typeof api.createTransaction === 'function') {
      try {
        const saved = await api.createTransaction(payload);
        if (saved && saved.id != null) {
          setTransactions(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
          setNextTransactionId(prev => Math.max(prev, saved.id + 1));
          return saved;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('createTransaction API call failed, falling back to local creation', err);
      }
    }
    // local fallback
    const newTxn = { id: nextTransactionId, ...payload };
    setTransactions(prev => [...prev, newTxn]);
    setNextTransactionId(prev => prev + 1);
    return newTxn;
  };

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      {page === 'home' && <HomePage navigate={navigate} />}

      {page === 'order' && (
        <OrderPage
          navigate={navigate}
          customers={customers}
          setCustomers={setCustomers}
          nextCustomerId={nextCustomerId}
          setNextCustomerId={setNextCustomerId}
          transactions={transactions}
          setTransactions={setTransactions}
          nextTransactionId={nextTransactionId}
          setNextTransactionId={setNextTransactionId}
          createCustomer={createCustomer}
          createTransaction={createTransaction}
        />
      )}

      {page === 'customers' && (
        <CustomerListPage
          navigate={navigate}
          customers={customers}
          setCustomers={setCustomers}
        />
      )}
    </div>
  );
}