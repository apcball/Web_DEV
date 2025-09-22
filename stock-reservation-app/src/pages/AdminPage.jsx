import React, { useState, useEffect } from 'react';
import './AdminPage.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import AdminStockTable from '../components/AdminStockTable';
import ReservationManagement from '../components/ReservationManagement';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminPage = ({
  stockData,
  setStockData,
  reservations,
  setReservations,
  onBack,
  onLogin
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [replenishQuantity, setReplenishQuantity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('adminActiveTab') || 'reservations';
    } catch (e) {
      return 'reservations';
    }
  });

  // persist active tab
  useEffect(() => {
    try {
      localStorage.setItem('adminActiveTab', activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);

  // Check for stored authentication on component mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuth');
    if (storedAuth) {
      try {
        const { isAuthenticated: storedIsAuthenticated, timestamp } = JSON.parse(storedAuth);
        // Check if the stored authentication is still valid (e.g., not older than 7 days)
        const now = new Date().getTime();
        const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        if (storedIsAuthenticated && (now - timestamp < oneWeek)) {
          setIsAuthenticated(true);
          setShowAuthForm(false);
          if (onLogin) onLogin(true);
        } else {
          // Clear expired authentication
          localStorage.removeItem('adminAuth');
        }
      } catch (e) {
        // If there's an error parsing, clear the stored auth
        localStorage.removeItem('adminAuth');
      }
    }
  }, [onLogin]);

  // Update suggestions when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      setSelectedProduct(null);
    } else {
      const filteredProducts = stockData.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filteredProducts);
    }
  }, [searchTerm, stockData]);

  // Handle product selection from suggestions
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setSuggestions([]);
  };

  // Simple authentication (in a real app, this would be more secure)
  const handleLogin = (e) => {
    e.preventDefault();
    // For demo purposes, using a simple password
    if (adminPassword === 'admin123') {
      setIsAuthenticated(true);
      setShowAuthForm(false);
      if (onLogin) onLogin(true);
      
      // Store authentication state if "Remember Me" is checked
      if (rememberMe) {
        const authData = {
          isAuthenticated: true,
          timestamp: new Date().getTime()
        };
        localStorage.setItem('adminAuth', JSON.stringify(authData));
      }
    } else {
      alert('Invalid password. Please try again.');
    }
  };

  // Create new database
  const handleCreateDatabase = async () => {
    if (!window.confirm("Are you sure you want to create a new database? This will delete all existing data.")) {
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3002/api/database/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create database');
      }
      
      // Refresh data
      const [productsRes, reservationsRes] = await Promise.all([
        fetch('http://localhost:3002/api/products'),
        fetch('http://localhost:3002/api/reservations')
      ]);
      
      const productsData = await productsRes.json();
      const reservationsData = await reservationsRes.json();
      
      // Map reservations to frontend shape
      const mapped = reservationsData.map(r => ({
        id: r.id,
        productId: productsData.find(p => p.sku === r.product_sku)?.id || null,
        productSku: r.product_sku,
        productName: r.product_name,
        quantity: r.reserved_quantity,
        customerName: r.customer_name,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        status: r.status,
        price: r.product_price || 0,
        salesPerson: r.salesPerson || ''
      }));
      
      setStockData(productsData);
      setReservations(mapped);
      
      alert('Database created successfully!');
    } catch (e) {
      alert('Error creating database: ' + (e.message || e));
    }
  };

  // Delete all database data
  const handleDeleteDatabase = async () => {
    if (!window.confirm("Are you sure you want to delete all data? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch('http://localhost:3002/api/database/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete database');
      }
      
      // Clear data
      setStockData([]);
      setReservations([]);
      
      alert('All data deleted successfully!');
    } catch (e) {
      alert('Error deleting database: ' + (e.message || e));
    }
  };

  // Export stock data to CSV
  const handleExportStock = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/products/export');
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export stock data');
      }
      
      // Get the CSV data
      const csvData = await res.text();
      
      // Create a blob and download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Stock data exported successfully!');
    } catch (e) {
      alert('Error exporting stock data: ' + (e.message || e));
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowAuthForm(true);
    setAdminPassword('');
    setRememberMe(false);
    
    // Clear stored authentication
    localStorage.removeItem('adminAuth');
    
    // Notify parent component
    if (onLogin) onLogin(false);
  };

  // Excel file upload handler
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Transform the data to match our stock format
          const stockData = jsonData.map((item, index) => ({
            sku: item.sku || item.SKU || item.Sku || '',
            name: item.name || item.Name || item.product || item.Product || 'Unknown Product',
            category: item.category || item.Category || item.type || item.Type || 'Uncategorized',
            price: parseFloat(item.price || item.Price || item.cost || item.Cost) || 0,
            quantity: parseInt(item.quantity || item.Quantity || item.stock || item.Stock) || 0
          }));
          
          // Filter out items without SKU
          const validStockData = stockData.filter(item => item.sku);
          
          // Send to backend
          (async () => {
            try {
              const res = await fetch('http://localhost:3002/api/products/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validStockData)
              });
              
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to import products');
              }
              
              const result = await res.json();
              
              // Refresh product list from server
              const prodsRes = await fetch('http://localhost:3002/api/products');
              const prods = await prodsRes.json();
              setStockData(prods);
              
              alert(`Successfully imported ${result.successCount} products! ${result.errorCount > 0 ? `(${result.errorCount} errors)` : ''}`);
            } catch (error) {
              console.error('Error importing products:', error);
              alert('Error importing products: ' + (error.message || error));
            }
          })();
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          alert('Error parsing Excel file. Please make sure it is a valid Excel file with the correct format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a valid Excel file (.xlsx)');
    }
    
    // Reset the file input
    event.target.value = '';
  };

  // Stock deduction function
  const handleDeductStock = (productId, quantity) => {
    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const product = stockData.find(item => item.id === productId);
    if (!product) {
      alert('Product not found');
      return;
    }

    if (quantity > product.quantity) {
      alert(`Cannot deduct more than available stock (${product.quantity})`);
      return;
    }

    (async () => {
        try {
          const product = stockData.find(item => item.id === productId);
          const res = await fetch(`http://localhost:3002/api/products/${product.sku}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: product.quantity - quantity })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to deduct stock');
          }

          // update local state
          const updatedStockData = stockData.map(item => 
            item.id === productId 
              ? { ...item, quantity: item.quantity - quantity } 
              : item
          );
          setStockData(updatedStockData);
          alert(`Successfully deducted ${quantity} units from ${product.name}`);
        } catch (e) {
          alert('Error deducting stock: ' + (e.message || e));
        }
      })();
  };

  // Stock replenishment function
  const handleReplenishStock = (e) => {
    e.preventDefault();
    
    if (!selectedProduct || !replenishQuantity) {
      alert('Please select a product and enter a quantity');
      return;
    }
    
    const quantity = parseInt(replenishQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    
    // Update via API
    (async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/products/${selectedProduct.sku}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: selectedProduct.quantity + quantity })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to replenish stock');
        }

        const updatedStockData = stockData.map(item => 
          item.id === selectedProduct.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
        setStockData(updatedStockData);
        alert(`Successfully replenished ${quantity} units to ${selectedProduct.name}`);
      } catch (e) {
        alert('Error replenishing stock: ' + (e.message || e));
      }
    })();
    
    // Reset form
    setSearchTerm('');
    setSelectedProduct(null);
    setReplenishQuantity('');
  };

  // Reservation cancellation function
  const handleCancelReservation = (reservationId) => {
    const reservation = reservations.find(res => res.id === reservationId);
    if (!reservation) {
      alert('Reservation not found');
      return;
    }

    // Call API to cancel (status change)
    (async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/reservations/${reservationId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to cancel reservation');
        }

        // reflect locally (product quantity will be updated by server)
        const updatedReservations = reservations.map(resv => resv.id === reservationId ? { ...resv, status: 'cancelled' } : resv);
        setReservations(updatedReservations);
        // refresh product list and reservations from server to get updated quantities
        const [prodsRes, reservationsRes] = await Promise.all([
          fetch('http://localhost:3002/api/products'),
          fetch('http://localhost:3002/api/reservations')
        ]);
        const prods = await prodsRes.json();
        const reservationsData = await reservationsRes.json();
        
        // map reservations to frontend shape
        const skuToId = {};
        prods.forEach(p => { skuToId[p.sku] = p.id; });
        
        const mapped = reservationsData.map(r => ({
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
        setReservations(mapped);

        alert(`Reservation for ${reservation.productName} has been cancelled`);
      } catch (e) {
        alert('Error cancelling reservation: ' + (e.message || e));
      }
    })();
  };

  // Reservation acceptance function
  const handleAcceptReservation = (reservation) => {
    const product = stockData.find(item => item.id === reservation.productId);
    if (!product) {
      alert('Product not found');
      return;
    }

    if (reservation.quantity > product.quantity) {
      alert(`Cannot accept reservation. Only ${product.quantity} units available in stock.`);
      return;
    }

    // Call API to mark completed (server will deduct stock if necessary)
    (async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/reservations/${reservation.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to accept reservation');
        }

        const updatedReservations = reservations.map(resv => resv.id === reservation.id ? { ...resv, status: 'completed' } : resv);
        setReservations(updatedReservations);

        // refresh products and reservations
        const [prodsRes, reservationsRes] = await Promise.all([
          fetch('http://localhost:3002/api/products'),
          fetch('http://localhost:3002/api/reservations')
        ]);
        const prods = await prodsRes.json();
        const reservationsData = await reservationsRes.json();
        
        // map reservations to frontend shape
        const skuToId = {};
        prods.forEach(p => { skuToId[p.sku] = p.id; });
        
        const mapped = reservationsData.map(r => ({
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
        setReservations(mapped);

        alert(`Reservation for ${reservation.productName} has been accepted. Stock has been deducted.`);
      } catch (e) {
        alert('Error accepting reservation: ' + (e.message || e));
      }
    })();
  };

  // If not authenticated, show nothing or a login prompt
  if (!isAuthenticated && !showAuthForm) {
    return (
      <div className="admin-page">
        <div className="admin-auth-required">
          <h2>Admin Access Required</h2>
          <p>You must be logged in as an administrator to view this page.</p>
          <button className="btn btn-primary" onClick={() => setShowAuthForm(true)}>
            Login as Admin
          </button>
          <button className="btn btn-outline" onClick={onBack}>
            Back to Stock View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={() => setActiveTab('stock')} className={activeTab === 'stock' ? 'active' : ''}>Stock Management</button>
          <button onClick={() => setActiveTab('reservations')} className={activeTab === 'reservations' ? 'active' : ''}>Reservation Management</button>
          <button onClick={handleLogout}>Logout</button>
          <button onClick={onBack}>Back to Stock View</button>
        </div>
      </header>

      <main className="admin-main">
        {!isAuthenticated && showAuthForm && (
          <div className="admin-auth-overlay">
            <form className="admin-auth-form" onSubmit={handleLogin}>
              <h2>Admin Login</h2>
              <div className="form-group">
                <label htmlFor="adminPassword">Password</label>
                <input
                  type="password"
                  id="adminPassword"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
              </label>
              <div className="auth-actions">
                <button type="submit" className="btn btn-primary">Login</button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowAuthForm(false); setAdminPassword(''); onBack(); }}>
                  Close
                </button>
              </div>
            </form>
          </div>
        )}
        {isAuthenticated && activeTab === 'stock' && (
          <section className="admin-section">
            <h2>Stock Management</h2>
            <AdminStockTable stockData={stockData} onDeductStock={handleDeductStock} />
            <div className="replenish-quick-form">
              <h3>Quick Replenish</h3>
              <div className="replenish-form-row">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {suggestions.length > 0 && (
                    <div className="suggestions-list">
                      {suggestions.slice(0,5).map(s => (
                        <div key={s.sku} className="suggestion-item" onClick={() => handleSelectProduct(s)}>
                          {s.name} ({s.sku})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={replenishQuantity}
                  onChange={(e) => setReplenishQuantity(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleReplenishStock}>Replenish</button>
              </div>
            </div>
            <div className="upload-area">
              <h3>Import Excel</h3>
              <input type="file" accept=".xlsx" onChange={handleExcelUpload} />
            </div>
            <div className="database-actions">
              <button className="btn btn-success" onClick={handleExportStock}>Export Stock (CSV)</button>
              <button className="btn btn-warning" onClick={handleCreateDatabase}>Create Database</button>
              <button className="btn btn-danger" onClick={handleDeleteDatabase}>Delete All Data</button>
            </div>
          </section>
        )}

        {isAuthenticated && activeTab === 'reservations' && (
          <div className="tab-content reservations-tab">
            <div>
              <section className="admin-section">
                <h2>Reservation Management</h2>
                <ReservationManagement 
                  reservations={reservations} 
                  stockData={stockData}
                  onCancelReservation={handleCancelReservation} 
                  onAcceptReservation={handleAcceptReservation}
                />
              </section>

              <section className="admin-section summary-section">
                <h2>Inventory Summary</h2>
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3>Total Products</h3>
                    <p className="summary-value">{stockData.length}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Stock Units</h3>
                    <p className="summary-value">
                      {stockData.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Reservations</h3>
                    <p className="summary-value">{reservations.length}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Reserved Units</h3>
                    <p className="summary-value">
                      {reservations.reduce((sum, res) => sum + res.quantity, 0)}
                    </p>
                  </div>
                </div>

                <div className="admin-instructions">
                  <h3>Admin Instructions</h3>
                  <ul>
                    <li>Use the Stock Management tab to upload new inventory data and deduct stock</li>
                    <li>Use the Reservation Management tab to accept or cancel reservations</li>
                    <li>When you Accept a reservation, the stock will be automatically deducted</li>
                    <li>Password for admin access: <strong>admin123</strong></li>
                    <li>All actions are logged and tracked for accountability</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;