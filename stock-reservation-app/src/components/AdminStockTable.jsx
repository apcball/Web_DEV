import React, { useState } from 'react';

const AdminStockTable = ({ stockData, onDeductStock }) => {
  const [deductQuantities, setDeductQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Get unique categories for filter dropdown
  const categories = ['all', ...new Set(stockData.map(item => item.category))];

  // Filter stock data based on search term and category
  const filteredStockData = stockData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleQuantityChange = (productId, value) => {
    setDeductQuantities(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleDeduct = (productId) => {
    const quantity = parseInt(deductQuantities[productId]) || 0;
    onDeductStock(productId, quantity);
    // Clear the input after deduction
    setDeductQuantities(prev => ({
      ...prev,
      [productId]: ''
    }));
  };

  return (
    <div className="admin-stock-management">
      <div className="admin-search-filters">
        <div className="admin-search-box">
          <input
            type="text"
            placeholder="Search by product name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="admin-filter-box">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="admin-filter-select"
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
      
      <div className="admin-stock-table-container">
        <table className="admin-stock-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price (฿)</th>
              <th>Current Stock</th>
              <th>Deduct Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStockData.length > 0 ? (
              filteredStockData.map((item) => (
                <tr key={item.id}>
                  <td data-label="Product">{item.name}</td>
                  <td data-label="Category">
                    <span className="category-tag">{item.category}</span>
                  </td>
                  <td data-label="Price">฿{item.price}</td>
                  <td data-label="Current Stock">{item.quantity}</td>
                  <td data-label="Deduct Quantity">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={deductQuantities[item.id] || ''}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="quantity-input"
                      placeholder="Enter amount"
                    />
                  </td>
                  <td data-label="Actions">
                    <button 
                      className="action-btn deduct-btn"
                      onClick={() => handleDeduct(item.id)}
                      disabled={!deductQuantities[item.id] || parseInt(deductQuantities[item.id]) <= 0}
                    >
                      Deduct Stock
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-results">
                  No products found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStockTable;