import React, { useEffect, useState } from 'react';
import OrderPage from './pages/OrderPage';
import CustomersPage from './pages/CustomerListPage';
import api from './api'; // adjust path if your api client lives elsewhere
import './App.css';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'order' | 'customers'
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nextCustomerId, setNextCustomerId] = useState(1);
  const [nextTransactionId, setNextTransactionId] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // If api is available, use it; otherwise keep empty lists
        if (api && typeof api.listCustomers === 'function') {
          const cs = await api.listCustomers();
          setCustomers(Array.isArray(cs) ? cs : []);
          // set nextCustomerId to max id + 1 to avoid collisions when offline
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
      setCustomers(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
      // sync nextCustomerId
      if (saved && saved.id != null) {
        setNextCustomerId(prev => Math.max(prev, saved.id + 1));
      }
      return saved;
    }
    // fallback local-only behavior
    const newId = nextCustomerId;
    const newCust = { id: newId, name: payload.name, contact: payload.contact, transactions: 0 };
    setCustomers(prev => [...prev, newCust]);
    setNextCustomerId(prev => prev + 1);
    return newCust;
  };

  const createTransaction = async (payload) => {
    if (api && typeof api.createTransaction === 'function') {
      const saved = await api.createTransaction(payload);
      setTransactions(prev => (Array.isArray(prev) ? [...prev, saved] : [saved]));
      if (saved && saved.id != null) {
        setNextTransactionId(prev => Math.max(prev, saved.id + 1));
      }
      return saved;
    }
    // fallback local-only
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