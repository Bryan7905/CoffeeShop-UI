import React from 'react';

const CustomersPage = ({ navigate, customers = [], setCustomers }) => {
  const handleDelete = (id) => {
    if (!window.confirm('Delete this customer?')) return;
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Customers</h2>
        <div>
          <button className="button" onClick={() => navigate('home')}>Back</button>
          <button className="button" onClick={() => navigate('order')}>Open POS</button>
        </div>
      </div>

      {customers.length === 0 ? (
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
                  <button className="button small" onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CustomersPage;