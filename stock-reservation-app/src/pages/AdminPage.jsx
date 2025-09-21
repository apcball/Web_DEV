import React, { useState, useEffect } from 'react';
import './AdminPage.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import AdminStockTable from '../components/AdminStockTable';
import ReservationManagement from '../components/ReservationManagement';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminPage = ({
  stockData,
  setStockData,
  reservations,
  setReservations,
  onBack
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [replenishQuantity, setReplenishQuantity] = useState('');
  const [suggestions, setSuggestions] = useState([]);

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
        } else {
          // Clear expired authentication
          localStorage.removeItem('adminAuth');
        }
      } catch (e) {
        // If there's an error parsing, clear the stored auth
        localStorage.removeItem('adminAuth');
      }
    }
  }, []);

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

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowAuthForm(true);
    setAdminPassword('');
    setRememberMe(false);
    
    // Clear stored authentication
    localStorage.removeItem('adminAuth');
  };

  // Excel file upload handler
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      // In a real app, we would parse the Excel file here
      // For this demo, we'll just show a success message
      alert('Excel file uploaded successfully! In a real application, this would parse your stock data.');
      
      // For demo purposes, we'll use sample data
      const sampleData = [
        { id: 1, name: 'Smartphone X', category: 'Electronics', price: 699, quantity: 25 },
        { id: 2, name: 'Laptop Pro', category: 'Computers', price: 1299, quantity: 10 },
        { id: 3, name: 'Wireless Headphones', category: 'Audio', price: 199, quantity: 40 },
        { id: 4, name: 'Smart Watch', category: 'Wearables', price: 299, quantity: 15 },
        { id: 5, name: 'Tablet Air', category: 'Electronics', price: 499, quantity: 30 },
        { id: 6, name: 'Bluetooth Speaker', category: 'Audio', price: 129, quantity: 35 },
        { id: 7, name: 'Gaming Console', category: 'Entertainment', price: 499, quantity: 8 },
        { id: 8, name: 'External SSD 1TB', category: 'Storage', price: 159, quantity: 22 },
        { id: 9, name: 'Wireless Keyboard', category: 'Accessories', price: 79, quantity: 50 },
        { id: 10, name: '4K Monitor', category: 'Computers', price: 399, quantity: 12 },
      ];
      
      setStockData(sampleData);
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

    // Update stock data
    const updatedStockData = stockData.map(item => 
      item.id === productId 
        ? { ...item, quantity: item.quantity - quantity } 
        : item
    );
    
    setStockData(updatedStockData);
    alert(`Successfully deducted ${quantity} units from ${product.name}`);
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
    
    // Update stock data
    const updatedStockData = stockData.map(item => 
      item.id === selectedProduct.id 
        ? { ...item, quantity: item.quantity + quantity } 
        : item
    );
    
    setStockData(updatedStockData);
    alert(`Successfully replenished ${quantity} units to ${selectedProduct.name}`);
    
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

    // Remove reservation
    const updatedReservations = reservations.filter(res => res.id !== reservationId);
    setReservations(updatedReservations);

    alert(`Reservation for ${reservation.productName} has been cancelled`);
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

    // Deduct stock
    const updatedStockData = stockData.map(item => 
      item.id === reservation.productId 
        ? { ...item, quantity: item.quantity - reservation.quantity } 
        : item
    );
    
    setStockData(updatedStockData);

    // Update reservation status
    const updatedReservations = reservations.map(res => 
      res.id === reservation.id 
        ? { ...res, status: 'completed' } 
        : res
    );
    
    setReservations(updatedReservations);

    alert(`Reservation for ${reservation.productName} has been accepted. Stock has been deducted.`);
  };

  // Reservation update function
  const handleUpdateReservation = (reservationId, newQuantity) => {
    const reservation = reservations.find(res => res.id === reservationId);
    if (!reservation) {
      alert('Reservation not found');
      return;
    }

    const product = stockData.find(item => item.id === reservation.productId);
    if (!product) {
      alert('Product not found');
      return;
    }

    if (newQuantity > product.quantity) {
      alert(`Cannot update reservation. Only ${product.quantity} units available in stock.`);
      return;
    }

    // Update reservation quantity
    const updatedReservations = reservations.map(res => 
      res.id === reservationId 
        ? { ...res, quantity: newQuantity } 
        : res
    );
    
    setReservations(updatedReservations);
    alert(`Reservation for ${reservation.productName} has been updated to ${newQuantity} units.`);
  };

  // Prepare chart data
  const chartData = {
    labels: stockData.map(item => item.name),
    datasets: [
      {
        label: 'Available Stock',
        data: stockData.map(item => item.quantity),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Current Stock Levels',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Products'
        }
      }
    }
  };

  if (showAuthForm) {
    return (
      <div className="admin-auth-container">
        <div className="admin-auth-box">
          <h2>Admin Access</h2>
          <p>Please enter the admin password to continue</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            <div className="form-group remember-me">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>
            <button type="submit" className="btn btn-primary">Login</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back to User View
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page app-main">
        <section className="admin-section">
          <div className="admin-header">
            <h2>Stock Management</h2>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
          
          {/* Stock Chart */}
          <div className="admin-chart-section">
            <h3>Stock Overview</h3>
            <div className="chart-container">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
          
          {/* Stock Replenishment Form */}
          <div className="admin-replenish-section">
            <h3>Replenish Stock</h3>
            <form onSubmit={handleReplenishStock} className="replenish-form">
              <div className="form-row">
                <div className="form-group search-group">
                  <label htmlFor="productSearch">Product:</label>
                  <div className="search-container">
                    <input
                      type="text"
                      id="productSearch"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search for a product..."
                      className="search-input"
                    />
                    {suggestions.length > 0 && (
                      <ul className="suggestions-list">
                        {suggestions.map(product => (
                          <li 
                            key={product.id} 
                            onClick={() => handleSelectProduct(product)}
                            className="suggestion-item"
                          >
                            {product.name} (Available: {product.quantity})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedProduct && (
                    <div className="selected-product">
                      Selected: {selectedProduct.name} (Current Stock: {selectedProduct.quantity})
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="replenishQuantity">Quantity to Add:</label>
                  <input
                    type="number"
                    id="replenishQuantity"
                    min="1"
                    value={replenishQuantity}
                    onChange={(e) => setReplenishQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    required
                  />
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary">
                Replenish Stock
              </button>
            </form>
          </div>
          
          {/* Excel Upload Section */}
          <div className="admin-upload-section">
            <h3>Upload Stock Data</h3>
            <p>Upload an Excel file to update stock information</p>
            <div className="upload-controls">
              <label htmlFor="excel-file" className="upload-btn">
                Choose Excel File
              </label>
              <input
                id="excel-file"
                type="file"
                accept=".xlsx"
                onChange={handleExcelUpload}
                className="file-input"
              />
              <small>Note: In a real application, this would parse actual Excel files</small>
            </div>
          </div>
          
          <AdminStockTable 
            stockData={stockData} 
            onDeductStock={handleDeductStock} 
          />
        </section>

        <section className="admin-section">
          <h2>Reservation Management</h2>
          <ReservationManagement 
            reservations={reservations} 
            stockData={stockData}
            onCancelReservation={handleCancelReservation} 
            onAcceptReservation={handleAcceptReservation}
            onUpdateReservation={handleUpdateReservation}
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
  );
};

export default AdminPage;