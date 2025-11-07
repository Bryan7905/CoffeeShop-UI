import React from 'react';

// HOMEPAGE
const HomePage = ({ navigate }) => {
    return (
        <div className="page-container">
            <h1>☕ Welcome to Bean Machine Coffee Shop</h1>
            <p>Select an action to continue.</p>
            <button className="button" onClick={() => navigate('order')}>
                Order 🛒
            </button>
            <button className="button" onClick={() => navigate('customers')}>
                Customer List 👥
            </button>
        </div>
    );
};

export default HomePage;