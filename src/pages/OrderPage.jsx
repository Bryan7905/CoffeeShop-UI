import React, { useState, useMemo } from 'react';
import api from '../api'; // use direct API for customer / transaction fetch/update when needed

// Menu data - unchanged from your design
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

const getDiscountRate = (transactions) => {
  let discount = 0.0;
  let loyalty = 'Basic';

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

const NewCustomerModal = ({ show, onClose, newCustomer, setNewCustomer, nextCustomerId, onRegister, registering }) => {
  if (!show) return null;
  const isInputValid = newCustomer.name.trim() !== '' && newCustomer.contact.trim() !== '';
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <h3>Register New Customer</h3>
        <div className="buyer-id-box">New Customer ID: <strong>{nextCustomerId}</strong></div>
        <input className="input" placeholder="Full Name" value={newCustomer.name}
          onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
        <input className="input" placeholder="Contact Info" value={newCustomer.contact}
          onChange={(e) => setNewCustomer({...newCustomer, contact: e.target.value})} />
        <button className="register-customer-button" onClick={onRegister} disabled={!isInputValid || registering}>
          {registering ? 'Registering...' : 'Register Customer'}
        </button>
      </div>
    </div>
  );
};

const ReceiptModal = ({ show, onClose, receiptText, onNewOrder }) => {
  if (!show || !receiptText) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box receipt-modal-content">
        <h3>Transaction Complete!</h3>
        <h4>🧾 Official Receipt</h4>
        <div className="receipt-display-box"><pre className="receipt-box">{receiptText}</pre></div>
        <button className="button primary-action" onClick={onNewOrder}>Start New Order</button>
        <button className="button secondary-action" onClick={onClose}>Close & Keep Customer</button>
      </div>
    </div>
  );
};

const OrderPage = ({
  navigate,
  customers,
  setCustomers,
  nextCustomerId,
  setNextCustomerId,
  transactions,
  setTransactions,
  nextTransactionId,
  setNextTransactionId,
  createCustomer, // optional - passed from App to persist customers
  createTransaction // optional - passed from App to persist transactions
}) => {
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState(MENU_CATEGORIES[0]);

  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const handleCreateCustomerAndUse = async (name, contact) => {
    if (!createCustomer) throw new Error('No createCustomer function provided');
    return createCustomer({ name, contact });
  };

  const handleCustomerSearch = () => {
    const id = parseInt(customerIdInput);
    const customer = Array.isArray(customers) ? customers.find(c => c.id === id) : null;
    if (customer) {
      setCurrentCustomer(customer);
      setReceipt(null);
    } else {
      setCurrentCustomer(null);
      setShowNewCustomerModal(true);
    }
  };

  const handleRegisterNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.contact) {
      console.error('Registration failed: Missing name or contact.');
      return;
    }
    setRegisteringCustomer(true);
    try {
      if (typeof createCustomer === 'function') {
        // Persist via App wrapper (which calls API) and use returned object when available
        const created = await handleCreateCustomerAndUse(newCustomer.name.trim(), newCustomer.contact.trim());
        const assignedId = (created && created.id != null) ? created.id : nextCustomerId;
        const customerToAdd = (created && created.id != null) ? created : {
          id: assignedId,
          name: newCustomer.name,
          contact: newCustomer.contact,
          transactions: 0
        };

        setCustomers(prev => Array.isArray(prev) ? [...prev, customerToAdd] : [customerToAdd]);
        setCurrentCustomer(customerToAdd);
        setCustomerIdInput(String(assignedId));
        if (nextCustomerId <= assignedId) setNextCustomerId(assignedId + 1);
      } else {
        // local fallback (shouldn't be used when API is configured)
        const newId = nextCustomerId;
        const newCust = { id: newId, name: newCustomer.name, contact: newCustomer.contact, transactions: 0 };
        setCustomers(prev => [...prev, newCust]);
        setNextCustomerId(prev => prev + 1);
        setCurrentCustomer(newCust);
        setCustomerIdInput(String(newId));
      }
      setNewCustomer({ name: '', contact: '' });
      setShowNewCustomerModal(false);
    } catch (err) {
      console.error('Error during customer registration:', err);
      alert('Failed to register customer. See console for details.');
    } finally {
      setRegisteringCustomer(false);
    }
  };

  const handleUpdateQty = (item, delta) => {
    const existingIndex = orderItems.findIndex(i => i.name === item.name);
    if (existingIndex > -1) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].qty += delta;
      if (updatedItems[existingIndex].qty <= 0) updatedItems.splice(existingIndex, 1);
      setOrderItems(updatedItems);
    } else if (delta > 0) {
      setOrderItems(prev => [...prev, { ...item, qty: 1 }]);
    }
  };

  const { subtotal, discountRate, savedAmount, finalAmount, loyalty } = useMemo(() => {
    let subtotal = 0;
    for (let i = 0; i < orderItems.length; i++) subtotal += orderItems[i].price * orderItems[i].qty;
    const transactionsCount = currentCustomer?.transactions || 0;
    const { discount: rate, loyalty: level } = getDiscountRate(transactionsCount);
    const discountValue = subtotal * rate;
    const final = subtotal - discountValue;
    return {
      subtotal,
      discountRate: rate * 100,
      savedAmount: discountValue,
      finalAmount: final,
      loyalty: level
    };
  }, [orderItems, currentCustomer]);

  const handlePayment = () => {
    const paid = parseFloat(paymentAmount);
    if (isNaN(paid)) {
      alert('Please enter a valid payment amount');
      return;
    }
    if (paid < finalAmount) {
      let required = finalAmount;
      let newPaymentStr = prompt(`Payment is not enough! You need $${(required - paid).toFixed(2)} more. Enter full amount:`);
      while (newPaymentStr !== null && (isNaN(parseFloat(newPaymentStr)) || parseFloat(newPaymentStr) < required)) {
        if (newPaymentStr === null) return;
        if (isNaN(parseFloat(newPaymentStr))) newPaymentStr = prompt(`Invalid input. Please enter the full amount (required: $${required.toFixed(2)}):`);
        else if (parseFloat(newPaymentStr) < required) newPaymentStr = prompt(`Payment is still not enough. You need $${(required - parseFloat(newPaymentStr)).toFixed(2)} more. Enter full amount:`);
      }
      if (newPaymentStr === null) return;
      const input = parseFloat(newPaymentStr);
      setPaymentAmount(input.toFixed(2));
      const change = input - required;
      generateReceipt(input, change);
    } else {
      const change = paid - finalAmount;
      generateReceipt(paid, change);
    }
  };

  const generateReceipt = async (paid, change) => {
    if (!currentCustomer) { console.error("Please select a customer first."); alert("Please select a customer first."); return; }
    if (orderItems.length === 0) { console.error("Order is empty."); alert("Order is empty."); return; }

    setSavingTransaction(true);

    // Optimistically update customer visits locally; we'll refresh from server if possible
    const updatedCustomer = { ...currentCustomer, transactions: (currentCustomer.transactions || 0) + 1 };
    setCustomers(prev => prev.map(c => c.id === currentCustomer.id ? updatedCustomer : c));
    setCurrentCustomer(updatedCustomer);

    const txnPayload = {
      customerId: currentCustomer.id,
      items: orderItems,
      total: subtotal,
      discount: savedAmount,
      finalTotal: finalAmount,
    };

    let txnToAdd = null;
    try {
      if (typeof createTransaction === 'function') {
        // use App's wrapper which persists to backend
        const saved = await createTransaction(txnPayload);
        txnToAdd = (saved && saved.id != null) ? saved : { id: nextTransactionId, ...txnPayload };

        // After creating transaction on server try to refresh the customer from backend so transactions count is authoritative
        try {
          if (api && typeof api.getCustomer === 'function') {
            const refreshed = await api.getCustomer(currentCustomer.id);
            if (refreshed && refreshed.id != null) {
              // replace local customer with server value
              setCustomers(prev => prev.map(c => (c.id === refreshed.id ? refreshed : c)));
              setCurrentCustomer(refreshed);
            }
          }
        } catch (refreshErr) {
          console.warn('Failed to refresh customer after transaction:', refreshErr);
        }

        // ensure nextTransactionId sync
        if (txnToAdd.id != null) {
          setNextTransactionId(prev => Math.max(prev, txnToAdd.id + 1));
        } else {
          setNextTransactionId(prev => prev + 1);
        }

        // update transactions list
        setTransactions(prev => Array.isArray(prev) ? [...prev, txnToAdd] : [txnToAdd]);
      } else {
        // fallback local-only behavior
        const newTxn = { id: nextTransactionId, ...txnPayload };
        setTransactions(prev => [...prev, newTxn]);
        setNextTransactionId(prev => prev + 1);
        txnToAdd = newTxn;
      }
    } catch (err) {
      console.error('Failed to persist transaction:', err);
      alert('Failed to save transaction to server. It has been recorded locally.');
      // fallback local add if transaction failed and wasn't added
      if (!txnToAdd) {
        const newTxn = { id: nextTransactionId, ...txnPayload };
        setTransactions(prev => [...prev, newTxn]);
        setNextTransactionId(prev => prev + 1);
        txnToAdd = newTxn;
      }
    } finally {
      setSavingTransaction(false);
    }

    // build receipt text using txnToAdd id (if present) or nextTransactionId fallback
    const txnIdForReceipt = (txnToAdd && txnToAdd.id != null) ? txnToAdd.id : nextTransactionId;
    let receiptText = `*** Bean Machine Coffee ***\n`;
    receiptText += `Transaction ID: ${txnIdForReceipt}\n`;
    receiptText += `Customer ID: ${currentCustomer.id} (${(updatedCustomer.transactions) || 0} visits)\n`;
    receiptText += `Loyalty Status: ${loyalty}\n`;
    receiptText += `--------------------------\n`;
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
    setShowReceiptModal(true);
  };

  const handleNewOrder = () => {
    setReceipt(null);
    setShowReceiptModal(false);
    setCurrentCustomer(null);
    setCustomerIdInput('');
  };

  const currentItemCount = (name) => orderItems.find(i => i.name === name)?.qty || 0;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>The Code Cafe POS</h2>
        <div>
          <button className="button" onClick={() => navigate('home')}>Back to Home</button>
          <button className="button" onClick={() => navigate('customers')}>Customer List</button>
        </div>
      </div>

      <div className="order-grid">
        <div className="main-content">
          <div className="section-card">
            <h3>1. Customer Loyalty & Lookup</h3>
            <div className="search-group">
              <input type="number" className="input" placeholder="Enter Buyer ID (e.g. 1)" value={customerIdInput}
                onChange={(e) => setCustomerIdInput(e.target.value)} />
              <button className="button primary-action" onClick={handleCustomerSearch} disabled={!customerIdInput}>Lookup</button>
              <button className="button secondary-action" onClick={() => setShowNewCustomerModal(true)}>New Customer</button>
            </div>
            {currentCustomer ? (
              <p style={{ marginTop: '10px' }}>
                <strong>Customer:</strong> {currentCustomer.name} (ID: {currentCustomer.id}). <strong>Loyalty:</strong> {loyalty} ({discountRate.toFixed(0)}% Off).
              </p>
            ) : (
              <p style={{ marginTop: '10px', color: '#888' }}>Enter a Buyer ID and click <strong>Lookup</strong> to check loyalty status.</p>
            )}
          </div>

          <div className="section-card">
            <h3>2. Choose Your Items</h3>
            <div className="tab-bar">
              {MENU_CATEGORIES.map(category => (
                <button key={category} className={`tab-button ${activeTab === category ? 'active' : ''}`} onClick={() => setActiveTab(category)}>
                  {category}
                </button>
              ))}
            </div>

            <div>
              {MENU_ITEMS_DATA[activeTab]?.map(item => (
                <div key={item.name} className="item-row">
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</p>
                    <span style={{ fontSize: '0.9em', color: '#555' }}>${item.price.toFixed(2)}</span>
                  </div>
                  <div className="qty-control">
                    <button className="qty-button decrement" onClick={() => handleUpdateQty(item, -1)} disabled={currentItemCount(item.name) === 0}>-</button>
                    <span>{currentItemCount(item.name)}</span>
                    <button className="qty-button increment" onClick={() => handleUpdateQty(item, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="section-card">
            <h3>Your Bill</h3>
            {orderItems.length === 0 ? <p style={{ textAlign: 'center', color: '#888' }}>No items selected.</p> : (
              <table style={{ marginBottom: 10, width: '100%' }}>
                <thead><tr><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr key={idx}><td>{item.name} x{item.qty}</td><td style={{ textAlign: 'right' }}>${(item.price * item.qty).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="bill-details">
              <p>Subtotal: <strong>${subtotal.toFixed(2)}</strong></p>
              <p className="discount-line">Discount ({discountRate.toFixed(0)}%): <strong>-${savedAmount.toFixed(2)}</strong></p>
            </div>

            <div className="final-total">FINAL TOTAL: <span>${finalAmount.toFixed(2)}</span></div>

            <button className="button" onClick={() => setOrderItems([])} disabled={orderItems.length === 0} style={{ width: '100%', marginTop: 10 }}>Clear Order</button>
          </div>

          <div className="section-card payment-section">
            <h3>3. Process Payment</h3>

            <div className="cash-input-group">
              <label>Cash Paid ($):</label>
              <input type="number" className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} disabled={finalAmount === 0 || !currentCustomer} />
            </div>

            <div className="change-due">CHANGE DUE: <span>{((Number(paymentAmount) || 0) > finalAmount ? (Number(paymentAmount) - finalAmount).toFixed(2) : '0.00')}</span></div>

            <button className="pay-button" onClick={handlePayment} disabled={finalAmount === 0 || !currentCustomer || savingTransaction}>
              {savingTransaction ? 'Saving...' : 'PAY NOW'}
            </button>
          </div>
        </div>
      </div>

      <NewCustomerModal show={showNewCustomerModal} onClose={() => { setShowNewCustomerModal(false); setRegisteringCustomer(false); }}
        newCustomer={newCustomer} setNewCustomer={setNewCustomer} nextCustomerId={nextCustomerId}
        onRegister={handleRegisterNewCustomer} registering={registeringCustomer} />

      <ReceiptModal show={showReceiptModal} onClose={() => setShowReceiptModal(false)} receiptText={receipt} onNewOrder={handleNewOrder} />
    </div>
  );
};

export default OrderPage;