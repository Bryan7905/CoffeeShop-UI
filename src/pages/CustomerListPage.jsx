import React, { useEffect, useState } from 'react';
import api from '../api';

const CustomerListPage = ({ navigate, customers = [], setCustomers }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('CustomerListPage render — customers:', customers);

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
          setCustomers(Array.isArray(cs) ? cs : []);
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
        setCustomers(Array.isArray(cs) ? cs : []);
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
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px' }}>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.contact}</td>
                <td>{c.transactions ?? 0}</td>
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