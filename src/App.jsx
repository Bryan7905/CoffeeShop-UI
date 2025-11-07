import React, { useState } from 'react';
import HomePage from "./pages/HomePage.jsx"; 
import OrderPage from "./pages/OrderPage.jsx"; 
import CustomerListPage from "./pages/CustomerListPage.jsx";
import './App.css'; // For the color theme

// Initial data for the application
const initialCustomers = [
  { id: 1, name: 'Alice Smith', contact: 'alice@example.com', transactions: 12 },
  { id: 2, name: 'Bob Johnson', contact: '555-1234', transactions: 5 },
  { id: 3, name: 'Charlie Brown', contact: 'charlie@mail.com', transactions: 28 },
];

const initialTransactions = [
  // Example transaction structure
  { id: 1001, customerId: 1, items: [{ name: 'Latte', qty: 1, price: 5 }], total: 5, discount: 0.5, finalTotal: 4.5 },
];

function App() {
  const [page, setPage] = useState('home');
  const [customers, setCustomers] = useState(initialCustomers);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [nextCustomerId, setNextCustomerId] = useState(4);
  const [nextTransactionId, setNextTransactionId] = useState(1002);

  const navigate = (destination) => setPage(destination);

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