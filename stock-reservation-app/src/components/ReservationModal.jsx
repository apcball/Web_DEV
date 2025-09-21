import React, { useState, useEffect } from 'react';

const ReservationModal = ({ stockData, reservations, onSubmit, onCancel, selectedProduct }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState({});
  const [discount, setDiscount] = useState(''); // Fixed discount amount as string to handle empty input
  const [vatEnabled, setVatEnabled] = useState(true); // VAT 7% enabled by default

  // Initialize quantities for all products and auto-select passed product
  useEffect(() => {
    const initialQuantities = {};
    stockData.forEach(product => {
      initialQuantities[product.id] = 1;
    });
    setQuantities(initialQuantities);
    
    // Auto-select the passed product if available
    if (selectedProduct) {
      setSelectedProducts([selectedProduct]);
      // Set focus to the search input or scroll to the product
    }
  }, [stockData, selectedProduct]);

  // Calculate reserved quantities for each product
  const calculateReservedQuantities = () => {
    const reserved = {};
    reservations.forEach(reservation => {
      if (!reserved[reservation.productId]) {
        reserved[reservation.productId] = 0;
      }
      reserved[reservation.productId] += reservation.quantity;
    });
    return reserved;
  };

  const reservedQuantities = calculateReservedQuantities();

  // Filter products based on search term
  const filteredProducts = stockData.filter(product => {
    const availableQuantity = product.quantity - (reservedQuantities[product.id] || 0);
    return (
      availableQuantity > 0 && 
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       product.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Toggle product selection
  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  // Handle quantity change
  const handleQuantityChange = (productId, quantity) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: parseInt(quantity) || 1
    }));
  };

  // Handle discount change
  const handleDiscountChange = (value) => {
    // Allow empty input or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDiscount(value);
    }
  };

  // Check if product is selected
  const isProductSelected = (productId) => {
    return selectedProducts.some(p => p.id === productId);
  };

  // Calculate totals with fixed discount and VAT
  const calculateTotals = () => {
    let subtotal = 0;
    
    selectedProducts.forEach(product => {
      const quantity = quantities[product.id] || 1;
      subtotal += quantity * product.price;
    });
    
    // Convert discount string to number, default to 0 if empty
    const discountValue = parseFloat(discount) || 0;
    
    // Ensure discount doesn't exceed subtotal
    const discountAmount = Math.min(discountValue, subtotal);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = vatEnabled ? afterDiscount * 0.07 : 0;
    const totalAmount = afterDiscount + vatAmount;
    
    return { 
      subtotal, 
      discountAmount, 
      afterDiscount, 
      vatAmount, 
      totalAmount,
      totalItems: selectedProducts.reduce((sum, product) => sum + (quantities[product.id] || 1), 0)
    };
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }
    
    if (!salesPerson.trim()) {
      alert('Please enter sales person name');
      return;
    }
    
    if (selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }
    
    // Validate quantities
    for (const product of selectedProducts) {
      const quantity = quantities[product.id] || 1;
      const availableQuantity = product.quantity - (reservedQuantities[product.id] || 0);
      
      if (quantity > availableQuantity) {
        alert(`Only ${availableQuantity} items available for ${product.name}`);
        return;
      }
      
      if (quantity <= 0) {
        alert(`Please enter a valid quantity for ${product.name}`);
        return;
      }
    }
    
    // Convert discount string to number for submission
    const discountValue = parseFloat(discount) || 0;
    
    // Create reservation objects for each selected product
    const newReservations = selectedProducts.map(product => ({
      productId: product.id,
      productName: product.name,
      quantity: quantities[product.id] || 1,
      customerName,
      salesPerson,
      price: product.price,
      discount: discountValue,
      vat: vatEnabled ? 7 : 0,
      subtotal: totals.subtotal,
      totalAmount: totals.totalAmount
    }));
    
    onSubmit(newReservations);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content reservation-modal">
        <div className="modal-header">
          <h2>Reserve Products</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Customer Information */}
            <section className="form-section">
              <h3>Customer Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="customerName">Customer Name:</label>
                  <input
                    type="text"
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="salesPerson">Sales Person:</label>
                  <input
                    type="text"
                    id="salesPerson"
                    value={salesPerson}
                    onChange={(e) => setSalesPerson(e.target.value)}
                    placeholder="Enter sales person name"
                    required
                  />
                </div>
              </div>
            </section>
            
            {/* Product Search */}
            <section className="form-section">
              <h3>Select Products</h3>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="products-list">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const availableQuantity = product.quantity - (reservedQuantities[product.id] || 0);
                    const isSelected = isProductSelected(product.id);
                    
                    return (
                      <div 
                        key={product.id} 
                        className={`product-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div 
                          className="product-info"
                          onClick={() => toggleProductSelection(product)}
                        >
                          <h4>{product.name}</h4>
                          <p className="product-category">{product.category}</p>
                          <p className="product-price">฿{product.price.toFixed(2)}</p>
                          <p className="product-availability">Available: {availableQuantity}</p>
                        </div>
                        
                        {isSelected && (
                          <div className="product-quantity">
                            <label>Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              max={availableQuantity}
                              value={quantities[product.id] || 1}
                              onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="no-products">No products available for reservation</p>
                )}
              </div>
            </section>
            
            {/* Discount and VAT */}
            <section className="form-section">
              <h3>Discount & VAT</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="discount">Discount (฿):</label>
                  <input
                    type="text"
                    id="discount"
                    value={discount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    className="discount-input"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group vat-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={vatEnabled}
                      onChange={(e) => setVatEnabled(e.target.checked)}
                    />
                    Include VAT 7%
                  </label>
                </div>
              </div>
            </section>
            
            {/* Summary */}
            <section className="form-section">
              <h3>Reservation Summary</h3>
              <div className="summary-box">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span className="summary-value">฿{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="summary-row">
                    <span>Discount:</span>
                    <span className="summary-value">-฿{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>After Discount:</span>
                  <span className="summary-value">฿{totals.afterDiscount.toFixed(2)}</span>
                </div>
                {vatEnabled && (
                  <div className="summary-row">
                    <span>VAT 7%:</span>
                    <span className="summary-value">฿{totals.vatAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total-row">
                  <span>Total Amount:</span>
                  <span className="summary-value">฿{totals.totalAmount.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Total Items:</span>
                  <span className="summary-value">{totals.totalItems}</span>
                </div>
              </div>
              
              {selectedProducts.length > 0 && (
                <div className="selected-products">
                  <h4>Selected Products:</h4>
                  <ul>
                    {selectedProducts.map(product => (
                      <li key={product.id}>
                        {product.name} - Qty: {quantities[product.id] || 1} - 
                        ฿{(product.price * (quantities[product.id] || 1)).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={selectedProducts.length === 0}>
              Confirm Reservations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationModal;