import React, { useState, useEffect } from 'react';
import './App.css';
import StockTable from './components/StockTable';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';
import ReservationModal from './components/ReservationModal';

function App() {
  const [stockData, setStockData] = useState([]);
  const [filteredStockData, setFilteredStockData] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:3002/api';

  // Load data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, reservationsRes] = await Promise.all([
          fetch(`${API_URL}/products`),
          fetch(`${API_URL}/reservations`)
        ]);

        if (!productsRes.ok || !reservationsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const products = await productsRes.json();
        const reservationsRaw = await reservationsRes.json();

        // create sku->id map
        const skuToId = {};
        products.forEach(p => { skuToId[p.sku] = p.id; });

        // Map backend reservation shape to frontend's shape
        const reservationsMapped = reservationsRaw.map(r => ({
          id: r.id,
          productId: skuToId[r.product_sku] || null,
          productSku: r.product_sku,
          productName: r.product_name,
          quantity: r.reserved_quantity,
          customerName: r.customer_name,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString() : (r.date || ''),
          status: r.status,
          price: r.product_price || 0,
          salesPerson: r.sales_person || r.salesPerson || '',
          discount: r.discount || 0,
          vat: r.vat || 0
        }));

        setStockData(products);
        setFilteredStockData(products);
        setReservations(reservationsMapped);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate reserved quantities for each product (only for pending reservations)
  const calculateReservedQuantities = () => {
    const reserved = {};
    reservations.filter(res => res.status !== 'completed').forEach(reservation => {
      if (!reserved[reservation.productId]) {
        reserved[reservation.productId] = 0;
      }
      reserved[reservation.productId] += reservation.quantity;
    });
    return reserved;
  };

  // Filter stock data based on search term and category
  useEffect(() => {
    const reservedQuantities = calculateReservedQuantities();
    
    let filtered = stockData.map(item => ({
      ...item,
      reservedQuantity: reservedQuantities[item.id] || 0,
      availableQuantity: item.quantity - (reservedQuantities[item.id] || 0)
    }));
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredStockData(filtered);
  }, [searchTerm, categoryFilter, stockData, reservations]);

  const handleReservation = async (newReservations) => {
    // Validate each reservation
    for (const reservation of newReservations) {
      const product = stockData.find(item => item.id === reservation.productId);
      const reservedQuantities = calculateReservedQuantities();
      const totalReserved = reservedQuantities[reservation.productId] || 0;
      const availableQuantity = product.quantity - totalReserved;
      
      if (!product) {
        alert('Product not found');
        return;
      }
      
      if (reservation.quantity > availableQuantity) {
        alert(`Only ${availableQuantity} items available for ${reservation.productName}`);
        return;
      }
      
      if (reservation.quantity <= 0) {
        alert(`Please enter a valid quantity for ${reservation.productName}`);
        return;
      }
    }

    try {
      const created = [];
      for (const r of newReservations) {
        const product = stockData.find(p => p.id === r.productId);
        const payload = {
          product_sku: product ? product.sku : r.productSku,
          customer_name: r.customerName,
          reserved_quantity: r.quantity,
          sales_person: r.salesPerson || '',
          discount: r.discount || 0,
          vat: r.vat || 0
        };

        const res = await fetch(`${API_URL}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create reservation');
        }

        const data = await res.json();
        created.push({ ...r, id: data.id, status: 'pending', date: new Date().toLocaleDateString(), productSku: payload.product_sku });
      }

      // refresh products and reservations from server to reflect updated stock
      const [prodsRes, reservationsRes] = await Promise.all([
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/reservations`)
      ]);
      const prods = await prodsRes.json();
      const reservationsRaw = await reservationsRes.json();

      const skuToId = {};
      prods.forEach(p => { skuToId[p.sku] = p.id; });

      const reservationsMapped = reservationsRaw.map(r => ({
        id: r.id,
        productId: skuToId[r.product_sku] || null,
        productSku: r.product_sku,
        productName: r.product_name,
        quantity: r.reserved_quantity,
        customerName: r.customer_name,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        status: r.status,
        price: r.product_price || 0,
        salesPerson: r.sales_person || r.salesPerson || '',
        discount: r.discount || 0,
        vat: r.vat || 0
      }));

      setStockData(prods);
      setFilteredStockData(prods);
      setReservations(reservationsMapped);
      setIsReservationModalOpen(false);
    } catch (e) {
      alert('Error creating reservation: ' + (e.message || e));
    }
  };

  // Get unique categories for filter dropdown
  const categories = ['all', ...new Set(stockData.map(item => item.category))];

  // Calculate summary statistics
  const reservedQuantities = calculateReservedQuantities();
  const totalReserved = Object.values(reservedQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalAvailable = stockData.reduce((sum, item) => {
    const reserved = reservedQuantities[item.id] || 0;
    return sum + (item.quantity - reserved);
  }, 0);

  const [selectedProductForReservation, setSelectedProductForReservation] = useState(null);

  // Handle view toggles
  const toggleAdminView = () => {
    setIsAdminView(true);
  };

  const toggleStockView = () => {
    setIsAdminView(false);
  };

  const handleReserveClick = (product) => {
    setSelectedProductForReservation(product);
    setIsReservationModalOpen(true);
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-container"><p>Loading data...</p></div>;
    }

    if (error) {
      return <div className="error-container"><p>Error: {error}</p></div>;
    }

    if (isAdminView) {
      return (
        <AdminPage 
          stockData={stockData}
          setStockData={setStockData}
          reservations={reservations}
          setReservations={setReservations}
          onBack={toggleStockView}
        />
      );
    }

    return (
      <>
        {/* Summary Section */}
        <section className="section summary-section">
          <h2 className="section-title">Reservation Summary</h2>
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total Products</h3>
              <p className="summary-value">{stockData.length}</p>
            </div>
            <div className="summary-card">
              <h3>Total Reserved</h3>
              <p className="summary-value">{totalReserved}</p>
            </div>
            <div className="summary-card">
              <h3>Available for Sale</h3>
              <p className="summary-value">{totalAvailable}</p>
            </div>
          </div>
        </section>

        {/* Search and Filter Section */}
        <section className="section search-section">
          <h2 className="section-title">Search Products</h2>
          <div className="search-filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by product name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            {(searchTerm || categoryFilter !== 'all') && (
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="search-results-info">
            Showing {filteredStockData.length} of {stockData.length} products
          </div>
        </section>

        <section className="section stock-section">
          <h2 className="section-title">Available Stock</h2>
          <div className="stock-table-container">
            <StockTable 
              stockData={filteredStockData} 
              onReserve={handleReserveClick} 
            />
          </div>
        </section>

        {reservations.filter(res => res.status !== 'completed').length > 0 && (
          <section className="section reservations-section">
            <h2 className="section-title">Your Reservations</h2>
            <div className="reservations-list">
              {(() => {
                // Group reservations by customer name
                const groupedReservations = {};
                reservations.filter(res => res.status !== 'completed').forEach(reservation => {
                  if (!groupedReservations[reservation.customerName]) {
                    groupedReservations[reservation.customerName] = [];
                  }
                  groupedReservations[reservation.customerName].push(reservation);
                });

                return Object.entries(groupedReservations).map(([customerName, customerReservations]) => {
                  // Calculate totals for this customer
                  const totalItems = customerReservations.reduce((sum, res) => sum + res.quantity, 0);
                  const totalAmount = customerReservations.reduce((sum, res) => sum + (res.quantity * res.price), 0);
                  
                  // Get discount and VAT info from first reservation (assuming they're the same for all)
                  const firstReservation = customerReservations[0];
                  const discount = firstReservation.discount || 0;
                  const vat = firstReservation.vat || 0;
                  
                  // Calculate subtotal, discount amount, and VAT amount
                  const subtotal = customerReservations.reduce((sum, res) => sum + (res.quantity * res.price), 0);
                  const discountAmount = Math.min(discount, subtotal);
                  const afterDiscount = subtotal - discountAmount;
                  const vatAmount = vat > 0 ? afterDiscount * (vat / 100) : 0;
                  const finalTotal = afterDiscount + vatAmount;
                  
                  return (
                    <div key={customerName} className="reservation-card">
                      <h3>{customerName}</h3>
                      <p><span>Sales Person:</span> {customerReservations[0].salesPerson}</p>
                      <p><span>Date:</span> {customerReservations[0].date}</p>
                      <div className="reservation-products">
                        <h4>Reserved Products:</h4>
                        <ul>
                          {customerReservations.map(reservation => (
                            <li key={reservation.id}>
                              {reservation.productName} - Qty: {reservation.quantity} - 
                              ฿{(reservation.quantity * reservation.price).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="reservation-summary">
                        <p><span>Subtotal:</span> ฿{subtotal.toFixed(2)}</p>
                        {discount > 0 && (
                          <p><span>Discount:</span> -฿{discountAmount.toFixed(2)}</p>
                        )}
                        <p><span>After Discount:</span> ฿{afterDiscount.toFixed(2)}</p>
                        {vat > 0 && (
                          <p><span>VAT {vat}%:</span> ฿{vatAmount.toFixed(2)}</p>
                        )}
                        <p><span>Total Amount:</span> ฿{finalTotal.toFixed(2)}</p>
                        <p><span>Total Items:</span> {totalItems}</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}
        
        {isReservationModalOpen && (
          <ReservationModal
            stockData={stockData}
            reservations={reservations}
            onSubmit={handleReservation}
            onCancel={() => {
              setIsReservationModalOpen(false);
              setSelectedProductForReservation(null);
            }}
            selectedProduct={selectedProductForReservation}
          />
        )}
      </>
    );
  };

  return (
    <div className="App app-main">
      <Navbar 
        isAdminView={isAdminView}
        toggleAdminView={toggleAdminView}
        toggleStockView={toggleStockView}
      />
      <header className="app-header">
        <h1>Stock Reservation System</h1>
        <p>View available stock and reserve products</p>
      </header>
      <div className="app-content">{renderContent()}</div>
    </div>
  );
}

export default App;