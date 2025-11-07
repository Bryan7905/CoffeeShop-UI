// Example changes for App.jsx (React). Only the relevant parts shown.

import React, { useEffect, useState } from 'react';
import api from './api'; // path to the api.js you already have
import HomePage from "./pages/HomePage.jsx"; 
import OrderPage from "./pages/OrderPage.jsx"; 
import CustomerListPage from "./pages/CustomerListPage.jsx";
import './App.css';

function App() {
  const [page, setPage] = useState('home');
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // load customers (and optionally transactions) from backend on first render
    async function load() {
      try {
        const cs = await api.listCustomers();
        setCustomers(cs || []);
        const txs = await api.listTransactions();
        setTransactions(txs || []);
      } catch (err) {
        console.error('Failed to load initial data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const navigate = (destination) => setPage(destination);

  // helper to create a customer and persist
  const createCustomer = async (customer) => {
    // customer = { name: '...', contact: '...' }
    const saved = await api.createCustomer(customer);
    setCustomers(prev => [...prev, saved]);
    return saved;
  };

  return (
    <div className="app-container">
      {loading ? <div>Loading...</div> : null}
      {page === 'home' && <HomePage navigate={navigate} />}
      {page === 'order' && (
        <OrderPage
          navigate={navigate}
          customers={customers}
          setCustomers={setCustomers}
          createCustomer={createCustomer}  // pass the persisting create
          transactions={transactions}
          setTransactions={setTransactions}
        />
      )}
      {page === 'customers' && (
        <CustomerListPage
          navigate={navigate}
          customers={customers}
        />
      )}
    </div>
  );
}

export default App;