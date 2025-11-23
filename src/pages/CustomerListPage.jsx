import React, { useEffect, useState } from 'react';
import api from '../api';

const safeDisplay = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  try {
    return JSON.stringify(val);
  } catch (e) {
    return String(val);
  }
};

const looksLikeTransaction = (obj) =>
  obj && typeof obj === 'object' && 'items' in obj && 'total' in obj && 'finalTotal' in obj;

const CustomerListPage = ({ navigate, customers = [], setCustomers }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Log unexpected shapes
  useEffect(() => {
    if (!Array.isArray(customers)) {
      console.warn('CustomerListPage expected customers to be an array but got:', customers);
      return;
    }
    const bad = customers.find(c => looksLikeTransaction(c));
    if (bad) {
      console.warn('CustomerListPage: at least one entry looks like a transaction object:', bad);
    }
  }, [customers]);

  // Load customers from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!setCustomers) return;
      setLoading(true);
      setError('');
      try {
        const cs = await api.listCustomers();
        if (!mounted) return;

        if (!Array.isArray(cs)) {
          console.warn('API returned non-array:', cs);
          setError('Server returned unexpected data for customers.');
          setCustomers([]);
          return;
        }

        setCustomers(cs);
      } catch (err) {
        console.warn('Failed to load customers from API', err);
        if (mounted) setError('Failed loading customers from server');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [setCustomers]);

  // Remove duplicates before displaying
  const uniqueCustomers = Array.isArray(customers)
    ? Array.from(new Map(customers.map(c => [c.id, c])).values())
    : [];

  const handleRefresh = async () => {
    if (!setCustomers) return;
    setLoading(true);
    setError('');
    try {
      const cs = await api.listCustomers();
      if (!Array.isArray(cs)) {
        console.warn('API returned non-array for refresh:', cs);
        setError('Server returned unexpected data.');
        setCustomers([]);
      } else {
        setCustomers(cs);
      }
    } catch (err) {
      console.warn('Failed to refresh customers', err);
      setError('Failed refreshing customers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <section className="hero-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Customers</h2>
          <div>
            <button className="button" onClick={() => navigate('home')}>Back</button>
            <button className="button" onClick={() => navigate('order')}>Open POS</button>
            <button className="button" onClick={handleRefresh} disabled={loading} style={{ marginLeft: 8 }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

      </section>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}

      {loading && !uniqueCustomers.length ? (
        <div style={{ marginTop: 20, color: '#666' }}>Loading customers...</div>
      ) : uniqueCustomers.length === 0 ? (
        <div style={{ marginTop: 20, color: '#666' }}>No customers found.</div>
      ) : (
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 4px' }}>ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Visits</th>
            </tr>
          </thead>

          <tbody>
            {uniqueCustomers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px' }}>{safeDisplay(c.id)}</td>
                <td>{safeDisplay(c.name)}</td>
                <td>{safeDisplay(c.contact)}</td>
                <td>{safeDisplay(c.transactions ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

  );
};

export default CustomerListPage;