import React, { useMemo } from 'react';

// Customer List Page
const CustomerListPage = ({ navigate, customers }) => {
  
  // Calculate loyalty status for display
  const customersWithLoyalty = useMemo(() => {
    // CLASS TOPIC: Arrays (Mapping to create a new array)
    return customers.map(customer => {
      // Re-use the discount logic
      const { loyalty } = getDiscountRate(customer.transactions);
      return {
        ...customer,
        loyalty,
      };
    });
  }, [customers]);

  return (
    <div className="page-container">
      <h2>👥 Customer List</h2>
      <button className="button" onClick={() => navigate('home')}>🏠 Back to Home</button>
      <button className="button" onClick={() => navigate('order')}>🛒 Back to Order</button>
      
      <hr style={{margin: '20px 0', borderTop: '1px solid #D9CFC7'}} />

      {/* CLASS TOPIC: While Loop (The display logic can be conceptually replaced by a while loop iterating through the array) */}
      {/* While(i < customersWithLoyalty.length) { render_customer(customersWithLoyalty[i++]) } */}
      {customersWithLoyalty.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        // CLASS TOPIC: Arrays (Used to iterate and display the list)
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Contact Info</th>
              <th>Transactions</th>
              <th>Loyalty Status</th>
            </tr>
          </thead>
          <tbody>
            {customersWithLoyalty.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.id}</td>
                <td>{customer.name}</td>
                <td>{customer.contact}</td>
                <td>{customer.transactions}</td>
                {/* CLASS TOPIC: Conditional Statement (Loyalty status display) */}
                <td><strong>{customer.loyalty}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Re-using the logic from OrderPage for consistency
const getDiscountRate = (transactions) => {
  if (transactions >= 26) return { discount: 0.25, loyalty: 'Diamond' };
  if (transactions >= 16) return { discount: 0.20, loyalty: 'Platinum' };
  if (transactions >= 11) return { discount: 0.10, loyalty: 'Gold' };
  if (transactions >= 6) return { discount: 0.05, loyalty: 'Silver' };
  return { discount: 0.0, loyalty: 'Basic' };
};

export default CustomerListPage;