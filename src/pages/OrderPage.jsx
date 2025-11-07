import React, { useState, useMemo } from 'react';

// Menu data - ADJUSTED TO MATCH IMAGE STYLE
const MENU_ITEMS_DATA = {
  Coffee: [
    { name: 'Espresso', price: 3.50, category: 'Coffee' },
    { name: 'Latte', price: 4.75, category: 'Coffee' },
    { name: 'Cappuccino', price: 4.50, category: 'Coffee' },
    { name: 'Americano', price: 3.25, category: 'Coffee' },
    { name: 'Mocha', price: 5.00, category: 'Coffee' },
  ],
  Pastry: [
    { name: 'Croissant', price: 3.00, category: 'Pastry' },
    { name: 'Muffin', price: 3.50, category: 'Pastry' },
  ],
  'Cake/Bread': [
    { name: 'Chocolate Cake Slice', price: 4.50, category: 'Cake/Bread' },
    { name: 'Banana Bread', price: 3.00, category: 'Cake/Bread' },
  ],
  Drinks: [
    { name: 'Canned Soda', price: 2.00, category: 'Drinks' },
    { name: 'Mango Smoothie', price: 4.50, category: 'Drinks' },
    { name: 'Bottled Water', price: 1.50, category: 'Drinks' },
  ],
  Food: [
    { name: 'Chicken Pesto Pasta', price: 10.00, category: 'Food' },
    { name: 'Beef Lasagna', price: 12.00, category: 'Food' },
  ],
};

const MENU_CATEGORIES = Object.keys(MENU_ITEMS_DATA);

// Loyalty Discount Logic (Kept as before)
const getDiscountRate = (transactions) => {
  let discount = 0.0;
  let loyalty = 'Basic';

  // CLASS TOPIC: Conditional Statement and Comparison Operators
  if (transactions >= 26) {
    discount = 0.25; loyalty = 'Diamond';
  } else if (transactions >= 16) {
    discount = 0.20; loyalty = 'Platinum';
  } else if (transactions >= 11) {
    discount = 0.10; loyalty = 'Gold';
  } else if (transactions >= 6) {
    discount = 0.05; loyalty = 'Silver';
  } else {
    discount = 0.0; loyalty = 'Basic';
  }
  return { discount, loyalty };
};


// New Customer Modal Component
const NewCustomerModal = ({ show, onClose, newCustomer, setNewCustomer, nextCustomerId, onRegister }) => {
    if (!show) return null;

    const isInputValid = newCustomer.name.trim() !== '' && newCustomer.contact.trim() !== '';

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <button className="modal-close-button" onClick={onClose}>
                    &times;
                </button>
                <h3>Register New Customer</h3>

                <div className="buyer-id-box">
                    New Customer ID: <strong>{nextCustomerId}</strong>
                </div>

                <input
                    className="input"
                    placeholder="Full Name (e.g., Jane Doe)"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
                <input
                    className="input"
                    placeholder="Contact Info (Email or Phone Number)"
                    value={newCustomer.contact}
                    onChange={(e) => setNewCustomer({...newCustomer, contact: e.target.value})}
                />

                <button 
                    className="register-customer-button" 
                    onClick={onRegister}
                    disabled={!isInputValid}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 12h-4"/><path d="M19 8v8"/></svg>
                    Register Customer
                </button>
            </div>
        </div>
    );
};


// RECEIPT MODAL COMPONENT (NEW)
const ReceiptModal = ({ show, onClose, receiptText, onNewOrder }) => {
    if (!show || !receiptText) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box receipt-modal-content">
                <h3 className="text-center mb-4 text-2xl font-semibold">Transaction Complete!</h3>
                <h4 className="text-center mb-4 text-xl">🧾 Official Receipt</h4>
                
                <div className="receipt-display-box">
                    <pre className="receipt-box">{receiptText}</pre>
                </div>
                
                <button 
                    className="button primary-action mt-6 w-full" 
                    onClick={onNewOrder}
                >
                    Start New Order
                </button>
                <button 
                    className="button secondary-action mt-2 w-full" 
                    onClick={onClose}
                >
                    Close & Keep Customer
                </button>
            </div>
        </div>
    );
};


const OrderPage = ({ navigate, customers, setCustomers, nextCustomerId, setNextCustomerId, transactions, setTransactions, nextTransactionId, setNextTransactionId }) => {
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState(MENU_CATEGORIES[0]);

  // STATE FOR MODAL VISIBILITY
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  // NEW STATE: Receipt Modal Visibility
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 1. Customer Search & Add
  const handleCustomerSearch = () => {
    // CLASS TOPIC: Arrays
    const id = parseInt(customerIdInput);
    const customer = customers.find(c => c.id === id);

    if (customer) {
      setCurrentCustomer(customer);
      setReceipt(null);
    } else {
      setCurrentCustomer(null);
      // Open modal if ID not found, prompting for registration
      setShowNewCustomerModal(true); 
    }
  };

  const handleRegisterNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.contact) {
      console.error('Registration failed: Missing name or contact.');
      return;
    }

    const newId = nextCustomerId;
    const newCust = { id: newId, name: newCustomer.name, contact: newCustomer.contact, transactions: 0 };

    // CLASS TOPIC: Shorthand Operators
    setCustomers(prev => [...prev, newCust]);
    setNextCustomerId(prev => prev + 1); 
    
    setCurrentCustomer(newCust);
    setNewCustomer({ name: '', contact: '' }); // Clear for next potential new customer
    setCustomerIdInput(newId.toString()); // Set search bar to new ID
    setShowNewCustomerModal(false); // Close the modal
  };
  
  // 2. Order Management

  const handleUpdateQty = (item, delta) => {
    const existingIndex = orderItems.findIndex(i => i.name === item.name);
    
    if (existingIndex > -1) {
      const updatedItems = [...orderItems];
      // CLASS TOPIC: Shorthand Operators
      updatedItems[existingIndex].qty += delta; 

      if (updatedItems[existingIndex].qty <= 0) {
        // Remove item if quantity drops to 0
        updatedItems.splice(existingIndex, 1);
      }
      setOrderItems(updatedItems);
    } else if (delta > 0) {
      // Add new item if delta is positive (e.g., pressing '+' for the first time)
      setOrderItems(prev => [...prev, { ...item, qty: 1 }]);
    }
  };

  // 3. Calculation Logic
  const { subtotal, discountRate, savedAmount, finalAmount, loyalty } = useMemo(() => {
    let subtotal = 0;
    // CLASS TOPIC: For Loop
    for (let i = 0; i < orderItems.length; i++) {
      // CLASS TOPIC: Arithmetic Operations
      subtotal += orderItems[i].price * orderItems[i].qty;
    }

    const transactions = currentCustomer?.transactions || 0;
    const { discount: rate, loyalty: level } = getDiscountRate(transactions);
    
    const discountValue = subtotal * rate;
    const final = subtotal - discountValue;

    return {
      subtotal: subtotal,
      discountRate: rate * 100,
      savedAmount: discountValue,
      finalAmount: final,
      loyalty: level
    };
  }, [orderItems, currentCustomer]);

  // 4. Payment and Receipt
  const handlePayment = () => {
    const paid = parseFloat(paymentAmount);

    // CLASS TOPIC: Conditional Statement
    if (paid < finalAmount) {
      // Simulate Do-While Loop for payment check
      let required = finalAmount;
      let input = paid;
      
      // CLASS TOPIC: Do-While Loop
      // NOTE: Using prompt for class topic demonstration, though custom modals are preferred in real apps.
      let newPaymentStr = prompt(`Payment is not enough! You need $${(required - input).toFixed(2)} more. Enter full amount:`);
      
      while (newPaymentStr !== null && (isNaN(parseFloat(newPaymentStr)) || parseFloat(newPaymentStr) < required)) {
          if (newPaymentStr === null) {
              // User cancelled
              console.log("Payment cancelled.");
              return;
          }
          if (isNaN(parseFloat(newPaymentStr))) {
               newPaymentStr = prompt(`Invalid input. Please enter the full amount (required: $${required.toFixed(2)}):`);
          } else if (parseFloat(newPaymentStr) < required) {
               newPaymentStr = prompt(`Payment is still not enough. You need $${(required - parseFloat(newPaymentStr)).toFixed(2)} more. Enter full amount:`);
          }
      }
      
      if (newPaymentStr === null) return; // Final check for cancellation
      input = parseFloat(newPaymentStr);
      
      setPaymentAmount(input.toFixed(2));
      const change = input - required;
      generateReceipt(input, change);

    } else {
        const change = paid - finalAmount;
        generateReceipt(paid, change);
    }
  };
  
  const generateReceipt = (paid, change) => {
    if (!currentCustomer) { console.error("Please select a customer first."); return; }
    if (orderItems.length === 0) { console.error("Order is empty."); return; }

    // Update Customer Transactions
    const updatedCustomer = { ...currentCustomer, transactions: currentCustomer.transactions + 1 };
    
    // CLASS TOPIC: Arrays
    setCustomers(prev => prev.map(c => c.id === currentCustomer.id ? updatedCustomer : c));
    setCurrentCustomer(updatedCustomer);

    // Create Transaction Record (Auto increment)
    const newTransaction = {
      id: nextTransactionId,
      customerId: currentCustomer.id,
      items: orderItems,
      total: subtotal,
      discount: savedAmount,
      finalTotal: finalAmount,
    };
    
    setTransactions(prev => [...prev, newTransaction]);
    // CLASS TOPIC: Shorthand Operators
    setNextTransactionId(prev => prev + 1); 

    // Generate Receipt Content
    let receiptText = `*** Bean Machine Coffee ***\n`;
    receiptText += `Transaction ID: ${newTransaction.id}\n`;
    receiptText += `Customer ID: ${currentCustomer.id} (${updatedCustomer.transactions} visits)\n`;
    receiptText += `Loyalty Status: ${loyalty}\n`;
    receiptText += `--------------------------\n`;
    
    // CLASS TOPIC: For Loop
    for (const item of orderItems) {
      const lineTotal = item.price * item.qty;
      receiptText += `${item.name.padEnd(20)} x${item.qty} = $${lineTotal.toFixed(2)}\n`;
    }
    
    receiptText += `--------------------------\n`;
    receiptText += `Subtotal: $${subtotal.toFixed(2)}\n`;
    receiptText += `Discount (${discountRate.toFixed(0)}%): -$${savedAmount.toFixed(2)}\n`;
    receiptText += `Final Total: $${finalAmount.toFixed(2)}\n`;
    receiptText += `Amount Paid: $${paid.toFixed(2)}\n`;
    receiptText += `Change: $${change.toFixed(2)}\n`;
    receiptText += `*** Thank You! ***`;

    setReceipt(receiptText);
    setOrderItems([]);
    setPaymentAmount('');

    // NEW: Show the Receipt Modal
    setShowReceiptModal(true);
  };
  
  // NEW FUNCTION: Handle new order button on receipt modal
  const handleNewOrder = () => {
    setReceipt(null);
    setShowReceiptModal(false);
    setCurrentCustomer(null);
    setCustomerIdInput('');
  };

  const currentItemCount = (name) => {
    return orderItems.find(i => i.name === name)?.qty || 0;
  };

  return (
    <div className="page-container">
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, textAlign: 'left' }}>The Code Cafe POS</h2>
        <div>
          <button className="button" onClick={() => navigate('home')}>Back to Home</button>
          <button className="button" onClick={() => navigate('customers')}>Customer List</button>
        </div>
      </div>

      {/* MAIN ORDER GRID */}
      <div className="order-grid">
        
        {/* LEFT COLUMN: Customer Lookup & Menu */}
        <div className="main-content">
          
          {/* 1. Customer Loyalty & Lookup */}
          <div className="section-card">
            <h3>1. Customer Loyalty & Lookup</h3>
            <div className="search-group">
              <input
                type="number"
                className="input"
                placeholder="Enter Buyer ID (e.g. 1)"
                value={customerIdInput}
                onChange={(e) => setCustomerIdInput(e.target.value)}
              />
              <button className="button primary-action" onClick={handleCustomerSearch} disabled={!customerIdInput}>Lookup</button>
              {/* BUTTON TO OPEN NEW CUSTOMER MODAL */}
              <button className="button secondary-action" onClick={() => setShowNewCustomerModal(true)}>New Customer</button>
            </div>
            {currentCustomer && (
              <p style={{ marginTop: '10px', textAlign: 'left' }}>
                <strong>Customer:</strong> {currentCustomer.name} (ID: {currentCustomer.id}). <strong>Loyalty:</strong> {loyalty} ({discountRate.toFixed(0)}% Off).
              </p>
            )}
            {!currentCustomer && (
                <p style={{marginTop: '10px', color: '#888', textAlign: 'left'}}>
                    Enter a Buyer ID and click <strong>Lookup</strong> to check loyalty status.
                </p>
            )}
          </div>

          {/* 2. Choose Your Items */}
          <div className="section-card">
            <h3>2. Choose Your Items</h3>

            {/* Menu Tabs */}
            <div className="tab-bar">
                {MENU_CATEGORIES.map(category => (
                    <button
                        key={category}
                        className={`tab-button ${activeTab === category ? 'active' : ''}`}
                        onClick={() => setActiveTab(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Menu Items for Active Tab */}
            <div>
                {MENU_ITEMS_DATA[activeTab]?.map(item => (
                    <div key={item.name} className="item-row">
                        <div style={{textAlign: 'left'}}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</p>
                            <span style={{ fontSize: '0.9em', color: '#555' }}>${item.price.toFixed(2)}</span>
                        </div>
                        
                        <div className="qty-control">
                            <button 
                                className="qty-button decrement" 
                                onClick={() => handleUpdateQty(item, -1)} 
                                disabled={currentItemCount(item.name) === 0}
                            >
                                -
                            </button>
                            <span>
                                {currentItemCount(item.name)}
                            </span>
                            <button 
                                className="qty-button increment" 
                                onClick={() => handleUpdateQty(item, 1)}
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Your Bill & Payment */}
        <div className="sidebar">
          
          {/* Your Bill Section */}
          <div className="section-card">
            <h3><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Your Bill</h3>
            {orderItems.length === 0 ? (
                <p style={{textAlign: 'center', color: '#888'}}>No items selected.</p>
            ) : (
                <table style={{marginBottom: '10px', fontSize: '0.9em', width: '100%', textAlign: 'left'}}>
                    <thead>
                        <tr style={{borderBottom: '1px solid #ddd'}}>
                            <th style={{paddingBottom: '5px'}}>Item</th>
                            <th style={{textAlign: 'right', paddingBottom: '5px'}}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderItems.map((item, index) => (
                            <tr key={index}>
                                <td>{item.name} x{item.qty}</td>
                                <td style={{textAlign: 'right'}}>${(item.price * item.qty).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div className="bill-details">
              <p>Subtotal: <span><strong>${subtotal.toFixed(2)}</strong></span></p>
              <p className="discount-line">Discount ({discountRate.toFixed(0)}%): <span><strong>-${savedAmount.toFixed(2)}</strong></span></p>
            </div>
            
            <div className="final-total">
                FINAL TOTAL: <span>${finalAmount.toFixed(2)}</span>
            </div>
            
            <button className="button" onClick={() => setOrderItems([])} disabled={orderItems.length === 0} style={{width: '100%', marginTop: '10px'}}>
                Clear Order
            </button>
          </div>

          {/* 3. Process Payment Section */}
          <div className="section-card payment-section">
            <h3><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 3. Process Payment</h3>
            
            <div className="cash-input-group">
              <label>Cash Paid ($):</label>
              <input
                type="number"
                className="input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={finalAmount === 0 || !currentCustomer}
              />
            </div>


            <div className="change-due">
                CHANGE DUE: 
                <span>
                    {/* CLASS TOPIC: Conditional Statement (Ternary Operator) */}
                    {(paymentAmount > finalAmount ? paymentAmount - finalAmount : 0).toFixed(2)}
                </span>
            </div>
            
            <button 
                className="pay-button" 
                onClick={handlePayment} 
                disabled={finalAmount === 0 || !currentCustomer || parseFloat(paymentAmount) < finalAmount}
            >
                PAY NOW
            </button>
          </div>
          
          {/* NOTE: The inline receipt display is removed now that we use the modal */}

        </div>
      </div>
      
      {/* NEW CUSTOMER REGISTRATION MODAL */}
      <NewCustomerModal
        show={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        nextCustomerId={nextCustomerId}
        onRegister={handleRegisterNewCustomer}
      />

      {/* NEW RECEIPT MODAL */}
      <ReceiptModal
        show={showReceiptModal}
        onClose={() => setShowReceiptModal(false)} // Just closes the modal, keeping customer info
        receiptText={receipt}
        onNewOrder={handleNewOrder} // Clears everything and starts a fresh session
      />
    </div>
  );
};

export default OrderPage;