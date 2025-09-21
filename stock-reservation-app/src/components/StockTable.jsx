import React from 'react';

const StockTable = ({ stockData, onReserve }) => {
  // Function to determine stock level indicator
  const getStockLevelIndicator = (quantity) => {
    if (quantity === 0) return { level: 'out', color: '#e53e3e' };
    if (quantity < 10) return { level: 'low', color: '#dd6b20' };
    if (quantity < 25) return { level: 'medium', color: '#d69e2e' };
    return { level: 'high', color: '#38a169' };
  };

  return (
    <div className="stock-table-wrapper">
      <table className="stock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Total</th>
            <th>Reserved</th>
            <th>Available</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stockData.map((item) => {
            const stockIndicator = getStockLevelIndicator(item.availableQuantity);
            return (
              <tr key={item.id}>
                <td data-label="Product">{item.name}</td>
                <td data-label="Category">
                  <span className="category-tag">{item.category}</span>
                </td>
                <td data-label="Price">฿{item.price}</td>
                <td data-label="Total">{item.quantity}</td>
                <td data-label="Reserved">{item.reservedQuantity}</td>
                <td data-label="Available">{item.availableQuantity}</td>
                <td data-label="Stock">
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
    </div>
  );
};

export default StockTable;