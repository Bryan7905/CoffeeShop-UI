import React from 'react';

// HOMEPAGE
const HomePage = ({ navigate }) => {
    return (
        <div className="page-container">
          <section className="hero-banner">
            <h1>Welcome to KOPI SHAP Café</h1>
            <p>Select an action to continue.</p>
            <button className="button" onClick={() => navigate('order')}>
                Order
            </button>
            <button className="button" onClick={() => navigate('customers')}>
                Customer List
            </button>
            <button className="button" onClick={() => navigate('reports')}>
                Reports
            </button>
          </section>
        </div>

    );
};
export default HomePage;