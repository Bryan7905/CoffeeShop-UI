import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';


// --- Constants & Helpers from OrderPage.js ---
const EXCHANGE_RATE = 56.0;
const LOCALE = 'en-PH';
const CURRENCY = 'PHP';

const formatCurrency = (value) => {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(value);
};

// Menu categories are needed to correctly classify items
const ALL_MENU_ITEMS = [
    { name: 'Espresso', price: 3.50, category: 'Coffee' },
    { name: 'Latte', price: 4.75, category: 'Coffee' },
    { name: 'Cappuccino', price: 4.50, category: 'Coffee' },
    { name: 'Americano', price: 3.25, category: 'Coffee' },
    { name: 'Mocha', price: 5.00, category: 'Coffee' },
    { name: 'Croissant', price: 3.00, category: 'Pastry' },
    { name: 'Muffin', price: 3.50, category: 'Pastry' },
    { name: 'Chocolate Cake Slice', price: 4.50, category: 'Cake/Bread' },
    { name: 'Banana Bread', price: 3.00, category: 'Cake/Bread' },
    { name: 'Canned Soda', price: 2.00, category: 'Drinks' },
    { name: 'Mango Smoothie', price: 4.50, category: 'Drinks' },
    { name: 'Bottled Water', price: 1.50, category: 'Drinks' },
    { name: 'Chicken Pesto Pasta', price: 10.00, category: 'Food' },
    { name: 'Beef Lasagna', price: 12.00, category: 'Food' },
];

const TIME_FRAMES = [
    { id: 'week', label: 'Last 7 Days', days: 7 },
    { id: '1month', label: 'Last 1 Month', days: 30 },
    { id: '3months', label: 'Last 3 Months', days: 90 },
    { id: '6months', label: 'Last 6 Months', days: 180 },
    { id: '1year', label: 'Last 1 Year', days: 365 },
];

const ReportsPage = ({ navigate, transactions = [], customers = [] }) => {
    const [activeTimeFrame, setActiveTimeFrame] = useState(TIME_FRAMES[0].id);
    const [reportsData, setReportsData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Safe parse helper - returns Date or null
    const parseTxnDate = (raw) => {
        if (raw == null) return null;
        try {
            if (typeof raw === 'number') {
                const d = new Date(raw);
                return isNaN(d.getTime()) ? null : d;
            }
            // string (ISO or other)
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    };

    // cutoff start-of-day for "days" window (so Last 7 Days includes today)
    const getCutoffDate = useCallback((days) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const cutoff = new Date(now);
        // subtract (days - 1) so "Last 7 Days" includes today and 6 previous days
        cutoff.setDate(cutoff.getDate() - (days - 1));
        return cutoff;
    }, []);

    // Keep timeframes ordered ascending by days (week, 1month, 3months, ...)
    const sortedFrames = useMemo(() => {
        return [...TIME_FRAMES].sort((a, b) => a.days - b.days);
    }, []);

    // compute counts per frame (non-overlapping) - optional, used to show badges/counts
    const countsPerFrame = useMemo(() => {
        const txns = Array.isArray(transactions) ? transactions : [];
        return sortedFrames.map((frame, idx) => {
            const start = getCutoffDate(frame.days);
            const end = (() => {
                if (idx === 0) {
                    // most recent window: up to end of today
                    const e = new Date();
                    e.setHours(23, 59, 59, 999);
                    return e;
                }
                const prev = sortedFrames[idx - 1];
                // transactions must be strictly older than prev's start-of-day
                return new Date(getCutoffDate(prev.days)); // start-of-day of prev window
            })();

            let count = 0;
            for (const txn of txns) {
                const raw = txn.transactionDate ?? txn.date ?? txn.createdAt ?? txn.timestamp ?? null;
                const parsed = parseTxnDate(raw);
                if (!parsed) continue;
                // normalize to time for comparison
                if (idx === 0) {
                    if (parsed >= start && parsed <= end) count++;
                } else {
                    // exclude the more recent window: parsed >= start && parsed < prevStart
                    if (parsed >= start && parsed < end) count++;
                }
            }
            return { id: frame.id, count };
        });
    }, [transactions, sortedFrames, getCutoffDate]);

    // generate reports for a single (non-overlapping) timeframe
    const generateReports = useCallback((frameId) => {
        setLoading(true);
        try {
            const frameIndex = sortedFrames.findIndex(f => f.id === frameId);
            const frame = sortedFrames[frameIndex];
            if (!frame) {
                setReportsData(null);
                return;
            }

            const start = getCutoffDate(frame.days);
            const end = (() => {
                if (frameIndex === 0) {
                    const e = new Date();
                    e.setHours(23, 59, 59, 999);
                    return e;
                }
                const prev = sortedFrames[frameIndex - 1];
                // prevStart is start-of-day of the more recent window (excluded)
                return new Date(getCutoffDate(prev.days));
            })();

            const txns = Array.isArray(transactions) ? transactions : [];

            // Filter using non-overlapping window logic:
            const filteredTransactions = txns.filter(txn => {
                const raw = txn.transactionDate ?? txn.date ?? txn.createdAt ?? txn.timestamp ?? null;
                const parsed = parseTxnDate(raw);
                if (!parsed) return false;
                if (frameIndex === 0) {
                    // most recent window: include parsed between start (inclusive) and end-of-today (inclusive)
                    return parsed >= start && parsed <= end;
                } else {
                    // older window: include parsed >= start && parsed < prevStart (end)
                    return parsed >= start && parsed < end;
                }
            });

            // count unique customers in this timeframe
            const customerIdSet = new Set(filteredTransactions.map(t => t.customerId).filter(id => id != null));
            const customersCount = customerIdSet.size;

            // customer txn counts
            const customerTxnCount = filteredTransactions.reduce((acc, txn) => {
                acc[txn.customerId] = (acc[txn.customerId] || 0) + 1;
                return acc;
            }, {});

            // Build a customersInFrame array with id, name and txnCount
            const customersInFrame = Array.from(customerIdSet).map(id => {
                const found = Array.isArray(customers) ? customers.find(c => String(c.id) === String(id)) : null;
                return {
                    id,
                    name: found && found.name ? found.name : `Customer ${id}`,
                    txnCount: customerTxnCount[id] || 0
                };
            }).sort((a, b) => (b.txnCount || 0) - (a.txnCount || 0));

            let mostLoyalCustomer = null;
            let maxTxns = 0;
            for (const id in customerTxnCount) {
                if (customerTxnCount[id] > maxTxns) {
                    maxTxns = customerTxnCount[id];
                    const found = customers.find(c => String(c.id) === id);
                    if (found) mostLoyalCustomer = { ...found, txnCount: customerTxnCount[id] };
                    else mostLoyalCustomer = { id, name: `Customer ${id}`, txnCount: customerTxnCount[id] };
                }
            }

            // items sold and revenue
            const itemSales = {};
            let totalRevenue = 0;
            let totalDiscount = 0;
            filteredTransactions.forEach(txn => {
                totalRevenue += Number(txn.finalTotal) || 0;
                totalDiscount += Number(txn.discount) || 0;
                if (Array.isArray(txn.items)) {
                    txn.items.forEach(item => {
                        const category = item.category || ALL_MENU_ITEMS.find(m => m.name === item.name)?.category || 'Other';
                        if (!itemSales[item.name]) itemSales[item.name] = { name: item.name, qty: 0, category };
                        itemSales[item.name].qty += (item.qty || 0);
                    });
                }
            });

            const itemSalesArray = Object.values(itemSales).sort((a, b) => b.qty - a.qty);
            const topDrink = itemSalesArray.find(item => item.category === 'Coffee' || item.category === 'Drinks');
            const topPastry = itemSalesArray.find(item => item.category === 'Pastry');

            const totalTxns = filteredTransactions.length;
            const averageOrderValue = totalTxns > 0 ? totalRevenue / totalTxns : 0;

            setReportsData({
                frameLabel: frame.label,
                frameId,
                mostLoyalCustomer,
                topDrink,
                topPastry,
                customersCount,
                customersInFrame, 
                salesSummary: {
                    totalTransactions: totalTxns,
                    totalRevenue,
                    totalDiscount,
                    averageOrderValue,
                },
            });
        } catch (err) {
            console.error('generateReports error:', err);
            setReportsData({ error: String(err) });
        } finally {
            setLoading(false);
        }
    }, [transactions, customers, sortedFrames, getCutoffDate]);

    // initial compute on mount
    useEffect(() => {
        generateReports(activeTimeFrame);
    }, []); 

    // recompute when the active frame or data change
    useEffect(() => {
        generateReports(activeTimeFrame);
    }, [activeTimeFrame, transactions, customers, generateReports]);

    const reportContent = useMemo(() => {
        if (loading) return <div>Calculating reports...</div>;
        if (!reportsData) return <div>Select a time frame to generate reports.</div>;
        if (reportsData.error) return <div style={{ color: 'red' }}>Error generating reports: {reportsData.error}</div>;

        const { mostLoyalCustomer, topDrink, topPastry, salesSummary, customersCount, frameLabel, customersInFrame } = reportsData;

        // explicit message when no customers found in chosen timeframe
        if (customersCount === 0) {
            return (
                <div style={{ padding: 16 }}>
                    <div style={{ marginBottom: 12, color: '#444', fontWeight: 600 }}>
                        No customers found for "{frameLabel}".
                    </div>
                    <div style={{ color: '#666' }}>
                        There are no customer transactions in this timeframe. Try selecting a different time frame or create a transaction (Order page).
                    </div>
                    <div style={{ color: '#999', fontSize: '0.9em', marginTop: 8 }}>
                        Transactions found: {salesSummary.totalTransactions} — Customers: {customersCount}
                    </div>
                </div>
            );
        }

        return (
            <>

                {/* New: list all customer names who purchased in this timeframe */}
                <section className="report-card" style={{ marginBottom: 12 }}>
                    <h3>Customers in Period</h3>
                    {customersInFrame && customersInFrame.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {customersInFrame.map(c => (
                                <li key={String(c.id)} style={{ marginBottom: 6 }}>
                                    <strong>{c.name}</strong> <span style={{ color: '#666' }}>(ID: {c.id})</span>
                                    <span style={{ marginLeft: 8, color: '#333' }}>— {c.txnCount} {c.txnCount === 1 ? 'transaction' : 'transactions'}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#666' }}>No customers recorded in this period.</p>
                    )}
                </section>

                <section className="report-card">
                    <h3>Most Loyal Customer</h3>
                    {mostLoyalCustomer ? (
                        <div>
                            <p><strong>Name:</strong> {mostLoyalCustomer.name}</p>
                            <p><strong>Customer ID:</strong> {mostLoyalCustomer.id}</p>
                            <p><strong>Transactions:</strong> {mostLoyalCustomer.txnCount} orders in the period</p>
                        </div>
                    ) : <p>No transactions recorded in this period.</p>}
                </section>

                <section className="report-card">
                    <h3>Most Bought Drink</h3>
                    {topDrink ? (
                        <div>
                            <p><strong>Item:</strong> {topDrink.name} ({topDrink.category})</p>
                            <p><strong>Quantity Sold:</strong> {topDrink.qty}</p>
                        </div>
                    ) : <p>No drinks sold in this period.</p>}
                </section>

                <section className="report-card">
                    <h3>Most Bought Pastry</h3>
                    {topPastry ? (
                        <div>
                            <p><strong>Item:</strong> {topPastry.name}</p>
                            <p><strong>Quantity Sold:</strong> {topPastry.qty}</p>
                        </div>
                    ) : <p>No pastries sold in this period.</p>}
                </section>

                <section className="report-card full-width">
                    <h3>Sales Summary</h3>
                    <table className="report-table">
                        <tbody>
                            <tr><td>Total Transactions</td><td style={{ textAlign: 'right' }}><strong>{salesSummary.totalTransactions}</strong></td></tr>
                            <tr><td>Total Revenue (Final Total)</td><td style={{ textAlign: 'right' }}><strong>{formatCurrency(salesSummary.totalRevenue)}</strong></td></tr>
                            <tr><td>Total Discount Given</td><td style={{ textAlign: 'right' }}>{formatCurrency(salesSummary.totalDiscount)}</td></tr>
                            <tr><td>Average Order Value (AOV)</td><td style={{ textAlign: 'right' }}>{formatCurrency(salesSummary.averageOrderValue)}</td></tr>
                        </tbody>
                        <div style={{ marginBottom: 8, color: '#333' }}>
                            Transactions in frame: {salesSummary.totalTransactions} — Customers: {customersCount}
                        </div>

                    </table>
                </section>
            </>
        );
    }, [reportsData, loading]);

    return (
        <div className="page-container">
            <div className="page-header">
                <section className="hero-banner">
                    <h2>Database Reports</h2>
                    <div className="nav-buttons">
                        <button className="nav-button" onClick={() => navigate('home')}>← Back to Home</button>
                    </div>
                </section>
            </div>

            <div className="report-controls">
                <h3>Select Time Frame:</h3>
                <div className="time-frame-selector" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sortedFrames.map(frame => {
                        const badge = countsPerFrame.find(b => b.id === frame.id)?.count ?? 0;
                        return (
                            <button
                                key={frame.id}
                                className={`time-button ${activeTimeFrame === frame.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTimeFrame(frame.id);
                                    generateReports(frame.id);
                                }}
                                disabled={loading}
                                style={{ position: 'relative', padding: '8px 12px' }}
                            >
                                {frame.label}
                                <span style={{
                                    marginLeft: 10,
                                    background: badge > 0 ? '#b67c46ff' : '#ddd',
                                    color: badge > 0 ? '#fff' : '#333',
                                    borderRadius: 12,
                                    padding: '2px 6px',
                                    fontSize: '0.8em'
                                }}>
                                    {badge}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="reports-grid">
                {reportContent}
            </div>
        </div>
    );
};

export default ReportsPage;