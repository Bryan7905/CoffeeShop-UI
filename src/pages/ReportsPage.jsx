import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

// Normalize transaction shape so reports logic sees consistent fields
const normalizeTransaction = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    // get transaction date from common fields
    const rawDate = raw.transactionDate ?? raw.date ?? raw.createdAt ?? raw.timestamp ?? null;
    let transactionDate = null;
    if (rawDate != null) {
        // handle epoch ms or numeric strings
        if (typeof rawDate === 'number') transactionDate = new Date(rawDate).toISOString();
        else if (!isNaN(Number(rawDate)) && String(rawDate).length >= 10 && !rawDate.includes('T')) {
            // timestamp seconds or ms (ambiguous) — prefer ms if length >=13
            const n = Number(rawDate);
            transactionDate = (String(rawDate).length >= 13) ? new Date(n).toISOString() : new Date(n * 1000).toISOString();
        } else {
            // assume ISO-like string
            const d = new Date(rawDate);
            transactionDate = isNaN(d.getTime()) ? null : d.toISOString();
        }
    }

    // customer: support customerId or nested customer object
    const customerId = raw.customerId ?? (raw.customer && (raw.customer.id ?? raw.customerId)) ?? null;
    const customerName = raw.customer?.name ?? raw.customerName ?? raw.customer?.fullName ?? null;

    // monetary fields - try multiple names, coerce to Number
    const finalTotal = raw.finalTotal ?? raw.total ?? raw.amount ?? 0;
    const discount = raw.discount ?? 0;

    // items array - ensure names, qty, price and category exist
    const items = Array.isArray(raw.items) ? raw.items.map(it => ({
        name: it.name ?? it.title ?? 'Unknown',
        qty: Number(it.qty ?? it.quantity ?? 0),
        price: Number(it.pricePhp ?? it.price ?? it.priceUsd ?? 0),
        category: it.category ?? it.cat ?? 'Other'
    })) : [];

    return {
        ...raw,
        transactionDate,
        customerId,
        customerName,
        finalTotal: Number(finalTotal || 0),
        discount: Number(discount || 0),
        items
    };
};


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
    const [debugVisible, setDebugVisible] = useState(false);
    const [serverCounts, setServerCounts] = useState(null);
    const [serverCountsLoading, setServerCountsLoading] = useState(false);

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
        // normalize incoming transactions so different shapes all count
        const rawTxns = Array.isArray(transactions) ? transactions : [];
        const txns = rawTxns.map(normalizeTransaction).filter(Boolean);

        return sortedFrames.map((frame, idx) => {
            const start = getCutoffDate(frame.days);
            const end = (() => {
                if (idx === 0) {
                    const e = new Date(); e.setHours(23, 59, 59, 999); return e;
                }
                const prev = sortedFrames[idx - 1];
                return new Date(getCutoffDate(prev.days));
            })();

            let count = 0;
            for (const txn of txns) {
                const parsed = txn.transactionDate ? new Date(txn.transactionDate) : null;
                if (!parsed || isNaN(parsed.getTime())) continue;
                if (idx === 0) {
                    if (parsed >= start && parsed <= end) count++;
                } else {
                    if (parsed >= start && parsed < end) count++;
                }
            }
            // If we have server-generated reports for the active frame, prefer that authoritative count
            try {
                if (reportsData && reportsData.frameId === frame.id && reportsData.salesSummary && typeof reportsData.salesSummary.totalTransactions === 'number') {
                    count = Number(reportsData.salesSummary.totalTransactions) || count;
                }
            } catch (e) {
                // ignore
            }
            return { id: frame.id, count };
        });
    }, [transactions, sortedFrames, getCutoffDate, reportsData]);
    // debug: helpful console output to inspect why badges may be zero
    try {
        // avoid noisy logs in production
        if (typeof window !== 'undefined' && window && process && process.env && process.env.NODE_ENV !== 'production') {
            const rawTxnsDbg = Array.isArray(transactions) ? transactions : [];
            const normDbg = rawTxnsDbg.map(normalizeTransaction).filter(Boolean);
            const frameCountsDbg = countsPerFrame.map(f => ({ frame: f.id, count: f.count }));
            // Print a compact summary
            // eslint-disable-next-line no-console
            console.debug('ReportsPage DEBUG: rawTxns', rawTxnsDbg.length, 'normalized', normDbg.length, 'frameCounts', frameCountsDbg);
            // show sample of normalized dates for quick inspection
            // eslint-disable-next-line no-console
            console.debug('ReportsPage DEBUG sample normalized dates:', normDbg.slice(0, 8).map(t => t.transactionDate));
        }
    } catch (dbgErr) {
        // eslint-disable-next-line no-console
        console.warn('ReportsPage debug log failed', dbgErr);
    }

    // UI-visible debug data (useful when console not available)
    const debugData = useMemo(() => {
        const raw = Array.isArray(transactions) ? transactions : [];
        const norm = raw.map(normalizeTransaction).filter(Boolean);
        const frames = countsPerFrame.map(f => ({ id: f.id, count: f.count }));
        return { rawCount: raw.length, normalizedCount: norm.length, frames, sampleDates: norm.slice(0, 10).map(t => t.transactionDate) };
    }, [transactions, countsPerFrame]);

    // generate reports for a single (non-overlapping) timeframe
    const generateReports = useCallback(async (frameId) => {
        setLoading(true);

        // debug: print raw and normalized counts for inspection
        try {
            const rawTxns = Array.isArray(transactions) ? transactions : [];
            const normalized = rawTxns.map(normalizeTransaction).filter(Boolean);
            console.log('DEBUG raw txns:', rawTxns.length);
            console.log('DEBUG normalized txns:', normalized.length);
            console.log('DEBUG sample normalized:', normalized.slice(0, 5));
            const start = getCutoffDate(7);
            const end = new Date(); end.setHours(23, 59, 59, 999);
            const last7 = normalized.filter(tx => {
                if (!tx || !tx.transactionDate) return false;
                const d = new Date(tx.transactionDate);
                if (isNaN(d.getTime())) return false;
                return d >= start && d <= end;
            });
            console.log('DEBUG last7 count:', last7.length);
            // show ISO dates to make parsing issues obvious
            console.table(last7.map(t => ({ id: t.id ?? t.transactionId ?? '(no id)', date: t.transactionDate })));
        } catch (dbgErr) {
            console.warn('Reports debug error', dbgErr);
        }

        try {
            // 1) Try server-side report if API supports it
            try {
                const server = await api.getReports(frameId).catch(() => null);
                if (server && typeof server === 'object' && !server.error) {
                    setReportsData(server);
                    return;
                }
            } catch (srvErr) {
                // server not available or returned error - fall through to client-side compute
                console.warn('Server-side reports failed, falling back to client compute:', srvErr);
            }

            // 2) Client-side compute using normalized transactions (existing logic)
            const frameIndex = sortedFrames.findIndex(f => f.id === frameId);
            const frame = sortedFrames[frameIndex];
            if (!frame) {
                setReportsData(null);
                return;
            }

            const start = getCutoffDate(frame.days);
            const end = (() => {
                if (frameIndex === 0) {
                    const e = new Date(); e.setHours(23, 59, 59, 999); return e;
                }
                const prev = sortedFrames[frameIndex - 1];
                return new Date(getCutoffDate(prev.days));
            })();

            const rawTxns = Array.isArray(transactions) ? transactions : [];
            const txns = rawTxns.map(normalizeTransaction).filter(Boolean);

            const filteredTransactions = txns.filter(txn => {
                const rawDate = txn.transactionDate;
                if (!rawDate) return false;
                const parsed = new Date(rawDate);
                if (isNaN(parsed.getTime())) return false;
                if (frameIndex === 0) return parsed >= start && parsed <= end;
                return parsed >= start && parsed < end;
            });

            // ... then keep the rest of the existing client-side aggregation code,
            // but replace references to txn.finalTotal, txn.discount, txn.items etc.
            // (Your current code already uses those keys — the normalize step sets them.)
            // setReportsData({...}) as before

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

    // Fetch server-side counts for all frames on mount so badges can show authoritative totals
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setServerCountsLoading(true);
            try {
                const promises = sortedFrames.map(async (f) => {
                    try {
                        const res = await api.getReports(f.id);
                        const count = res && res.salesSummary && typeof res.salesSummary.totalTransactions === 'number'
                            ? res.salesSummary.totalTransactions
                            : null;
                        return { id: f.id, count };
                    } catch (e) {
                        return { id: f.id, count: null };
                    }
                });
                const results = await Promise.all(promises);
                if (!mounted) return;
                const map = {};
                results.forEach(r => { if (r.count != null) map[r.id] = r.count; });
                setServerCounts(map);
            } finally {
                if (mounted) setServerCountsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [sortedFrames]);

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
                <section className="report-card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Customers in Period</h3>
                    {customersInFrame && customersInFrame.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'none', textAlign: 'center', width: '100%', maxWidth: 520 }}>
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

                <section className="report-card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Most Loyal Customer</h3>
                    {mostLoyalCustomer ? (
                        <div>
                            <p><strong>Name:</strong> {mostLoyalCustomer.name}</p>
                            <p><strong>Customer ID:</strong> {mostLoyalCustomer.id}</p>
                            <p><strong>Transactions:</strong> {mostLoyalCustomer.txnCount} orders in the period</p>
                        </div>
                    ) : <p>No transactions recorded in this period.</p>}
                </section>

                <section className="report-card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Most Bought Drink</h3>
                    {topDrink ? (
                        <div>
                            <p><strong>Item:</strong> {topDrink.name} ({topDrink.category})</p>
                            <p><strong>Quantity Sold:</strong> {topDrink.qty}</p>
                        </div>
                    ) : <p>No drinks sold in this period.</p>}
                </section>

                <section className="report-card" style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3>Most Bought Pastry</h3>
                    {topPastry ? (
                        <div>
                            <p><strong>Item:</strong> {topPastry.name}</p>
                            <p><strong>Quantity Sold:</strong> {topPastry.qty}</p>
                        </div>
                    ) : <p>No pastries sold in this period.</p>}
                </section>

                <section className="report-card full-width">
                    <h3 style={{ textAlign: 'center' }}>Sales Summary</h3>
                    <table className="report-table">
                        <tbody>
                            <tr><td>Total Transactions</td><td style={{ textAlign: 'right' }}><strong>{salesSummary.totalTransactions}</strong></td></tr>
                            <tr><td>Total Revenue (Final Total)</td><td style={{ textAlign: 'right' }}><strong>{formatCurrency(salesSummary.totalRevenue)}</strong></td></tr>
                            <tr><td>Total Discount Given</td><td style={{ textAlign: 'right' }}>{formatCurrency(salesSummary.totalDiscount)}</td></tr>
                            <tr><td>Average Order Value (AOV)</td><td style={{ textAlign: 'right' }}>{formatCurrency(salesSummary.averageOrderValue)}</td></tr>
                            <tr style={{ marginBottom: 8, color: '#333', textAlign: 'left' }}>
                            <td>Transactions in frame:</td>
                                <td style={{ textAlign: 'right' }}>{salesSummary.totalTransactions} — Customers: {customersCount}</td>
                            </tr>
                        </tbody>
                        

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
                        // prefer server-provided counts if available, otherwise use client-side counts
                        const clientBadge = countsPerFrame.find(b => b.id === frame.id)?.count ?? 0;
                        const badge = (serverCounts && typeof serverCounts[frame.id] === 'number') ? serverCounts[frame.id] : clientBadge;
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