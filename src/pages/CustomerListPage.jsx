import React, { useEffect, useState } from 'react';
import api from '../api';

const safeDisplay = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  // For objects/arrays, stringify so React doesn't try to render them directly
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

  // Helpful runtime check: log unexpected shapes so you can diagnose API issues quickly
  useEffect(() => {
    if (!Array.isArray(customers)) {
      console.warn('CustomerListPage expected customers to be an array but got:', customers);
      return;
    }
    const bad = customers.find(c => looksLikeTransaction(c));
    if (bad) {
      console.warn('CustomerListPage: at least one entry looks like a transaction object (not a customer):', bad);
    }
  }, [customers]);

  // Load latest customers from backend when this page mounts.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!setCustomers) return; // nothing to update in parent
      setLoading(true);
      setError('');
      try {
        if (api && typeof api.listCustomers === 'function') {
          const cs = await api.listCustomers();
          if (!mounted) return;
          // Defensive: if API returned something unexpected, keep UI stable and log
          if (!Array.isArray(cs)) {
            console.warn('API returned non-array for listCustomers:', cs);
            setError('Server returned unexpected data for customers.');
            setCustomers([]);
            return;
          }
          setCustomers(cs);
        }
      } catch (err) {
        console.warn('Failed to load customers from API', err);
        if (mounted) setError('Failed loading customers from server');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setCustomers]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;

    // Try deleting on server first; if API not available, fall back to local-only removal
    if (api && typeof api.deleteCustomer === 'function') {
      try {
        setLoading(true);
        await api.deleteCustomer(id);
        // update parent state
        if (setCustomers) setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (err) {
        console.error('Failed to delete customer via API', err);
        alert('Could not delete customer on server. See console for details.');
      } finally {
        setLoading(false);
      }
    } else {
      // fallback local-only remove
      if (setCustomers) setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleRefresh = async () => {
    if (!setCustomers) return;
    setLoading(true);
    setError('');
    try {
      if (api && typeof api.listCustomers === 'function') {
        const cs = await api.listCustomers();
        if (!Array.isArray(cs)) {
          console.warn('API returned non-array for listCustomers on refresh:', cs);
          setError('Server returned unexpected data for customers.');
          setCustomers([]);
        } else {
          setCustomers(cs);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh customers from API', err);
      setError('Failed refreshing customers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
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

      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}

      {loading && !customers.length ? (
        <div style={{ marginTop: 20, color: '#666' }}>Loading customers...</div>
      ) : !Array.isArray(customers) ? (
        <div style={{ marginTop: 20, color: 'red' }}>Unexpected customer data. See console.</div>
      ) : customers.length === 0 ? (
        <div style={{ marginTop: 20, color: '#666' }}>No customers found.</div>
      ) : (
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 4px' }}>ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Visits</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={typeof c === 'object' && c !== null ? (c.id ?? JSON.stringify(c)) : String(c)} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px' }}>{safeDisplay(c.id)}</td>
                <td>{safeDisplay(c.name)}</td>
                <td>{safeDisplay(c.contact)}</td>
                <td>{safeDisplay(c.transactions ?? 0)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="button small"
                    onClick={() => handleDelete(c.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CustomerListPage;