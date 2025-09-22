import React, { useState } from 'react';

const StockTable = ({ stockData, onReserve }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Function to determine stock level indicator
  const getStockLevelIndicator = (quantity) => {
    if (quantity === 0) return { level: 'out of stock', color: '#ef4444' };
    if (quantity < 10) return { level: 'low stock', color: '#f59e0b' };
    if (quantity < 25) return { level: 'medium stock', color: '#3b82f6' };
    return { level: 'in stock', color: '#10b981' };
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = stockData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(stockData.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="stock-table-wrapper">
      {/* Pagination Controls - Top */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages} (Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, stockData.length)} of {stockData.length} products)
          </span>
          
          <button 
            className="pagination-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
      
      <table className="stock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Total</th>
            <th>Reserved</th>
            <th>Available</th>
            <th>Stock Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item) => {
            const stockIndicator = getStockLevelIndicator(item.availableQuantity);
            return (
              <tr key={item.id}>
                <td data-label="Product">{item.name}</td>
                <td data-label="SKU">{item.sku}</td>
                <td data-label="Category">
                  <span className="category-tag">{item.category}</span>
                </td>
                <td data-label="Price">฿{item.price.toFixed(2)}</td>
                <td data-label="Total">{item.quantity}</td>
                <td data-label="Reserved">{item.reservedQuantity}</td>
                <td data-label="Available">{item.availableQuantity}</td>
                <td data-label="Stock Status">
                  <div className="stock-level" style={{ color: stockIndicator.color }}>
                    <span className="stock-dot" style={{ backgroundColor: stockIndicator.color }}></span>
                    {stockIndicator.level}
                  </div>
                </td>
                <td data-label="Actions">
                  <button 
                    className="reserve-btn" 
                    onClick={() => onReserve(item)}
                    disabled={item.availableQuantity <= 0}
                  >
                    {item.availableQuantity <= 0 ? 'Out of Stock' : 'Reserve'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages} (Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, stockData.length)} of {stockData.length} products)
          </span>
          
          <button 
            className="pagination-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StockTable;