import React, { useEffect, useState } from 'react';
import OrderPage from './pages/OrderPage';
import CustomersPage from './pages/CustomerListPage';
import api from './api';
import api from './api';
import './App.css';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'order' | 'customers'
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nextCustomerId, setNextCustomerId] = useState(1);
  const [nextTransactionId, setNextTransactionId] = useState(1);
  const [loading, setLoading] = useState(true);

  // Configure API base URL from environment or global variable:
  // When building or serving, set VITE_API_URL, or set window.__API_BASE_URL
  // Example .env: VITE_API_URL=http://localhost:8080
  useEffect(() => { 
    const envUrl = (typeof process !== 'undefined' && process.env && (process.env.VITE_API_BASE_URL || process.env.REACT_APP_API_URL)) || window.__API_BASE_URL; 
    if (envUrl) { 
      try { api.setBaseUrl(envUrl); console.log('API base URL set to', envUrl); 
      } catch (e) { 
        console.warn('Failed to set API base URL', e);
      } 
    } 
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (api && typeof api.listCustomers === 'function') {
          const cs = await api.listCustomers();
          setCustomers(Array.isArray(cs) ? cs : []);
          const maxCusId = cs && cs.length ? Math.max(...cs.map(c => c.id || 0)) : 0;
          setNextCustomerId(maxCusId + 1);
        }
        if (api && typeof api.listTransactions === 'function') {
          const txs = await api.listTransactions();
          setTransactions(Array.isArray(txs) ? txs : []);
          const maxTxnId = txs && txs.length ? Math.max(...txs.map(t => t.id || 0)) : 0;
          setNextTransactionId(maxTxnId + 1);
        }
      } catch (err) {
        console.warn('Failed to load initial data from API; falling back to empty lists.', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // wrapper that both calls API and updates local state
  const createCustomer = async (payload) => {
    if (api && typeof api.createCustomer === 'function') {
      const saved = await api.createCustomer(payload);
      // prefer server returned object; if server omitted id, fall back below
      if (saved && saved.id != null) {
        setCustomers(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
        setCustomers(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
        setNextCustomerId(prev => Math.max(prev, saved.id + 1));
        return saved;
        return saved;
      }
      // if server returned something without id, continue to fallback logic
    }
    const newId = nextCustomerId;
    const newCust = { id: newId, name: payload.name, contact: payload.contact, transactions: 0 };
    setCustomers(prev => [...prev, newCust]);
    setNextCustomerId(prev => prev + 1);
    return newCust;
  };

  const createTransaction = async (payload) => {
    if (api && typeof api.createTransaction === 'function') {
      const saved = await api.createTransaction(payload);
      if (saved && saved.id != null) {
        setTransactions(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
        setTransactions(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
        setNextTransactionId(prev => Math.max(prev, saved.id + 1));
        return saved;
        return saved;
      }
      // if server returned something without id, fall back to local id below
    }
    const newTxn = { id: nextTransactionId, ...payload };
    setTransactions(prev => [...prev, newTxn]);
    setNextTransactionId(prev => prev + 1);
    return newTxn;
  };

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <div className="app-root">
      {view === 'home' && (
        <div style={{ padding: 20 }}>
          <h1>Bean Machine Coffee - Admin</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setView('order')} className="button">Open POS</button>
            <button onClick={() => setView('customers')} className="button">Customer List</button>
          </div>
        </div>
      )}

      {view === 'order' && (
        <OrderPage
          navigate={(target) => setView(target)}
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

      {view === 'customers' && (
        <CustomersPage
          navigate={(target) => setView(target)}
          customers={customers}
          setCustomers={setCustomers}
        />
      )}
    </div>
  );
}