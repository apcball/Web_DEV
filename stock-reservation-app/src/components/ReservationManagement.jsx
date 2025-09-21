import React, { useState } from 'react';

const ReservationManagement = ({ reservations, stockData, onCancelReservation, onAcceptReservation, onUpdateReservation }) => {
  // Create a map of product names and available quantities for easy lookup
  const productMap = {};
  stockData.forEach(item => {
    productMap[item.id] = {
      name: item.name,
      availableQuantity: item.quantity
    };
  });

  // State for tracking edited quantities
  const [editedQuantities, setEditedQuantities] = useState({});
  const [isEditing, setIsEditing] = useState({});

  // Group reservations by customer name
  const groupedReservations = {};
  reservations.forEach(reservation => {
    if (!groupedReservations[reservation.customerName]) {
      groupedReservations[reservation.customerName] = [];
    }
    groupedReservations[reservation.customerName].push(reservation);
  });

  // Handle quantity change
  const handleQuantityChange = (reservationId, newQuantity) => {
    setEditedQuantities(prev => ({
      ...prev,
      [reservationId]: parseInt(newQuantity) || 0
    }));
  };

  // Start editing a reservation
  const startEditing = (reservationId) => {
    setIsEditing(prev => ({
      ...prev,
      [reservationId]: true
    }));
  };

  // Save edited quantity
  const saveEdit = (reservation) => {
    const newQuantity = editedQuantities[reservation.id];
    if (newQuantity !== undefined && newQuantity !== reservation.quantity) {
      if (newQuantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }
      
      // Check if new quantity exceeds available stock
      const product = stockData.find(item => item.id === reservation.productId);
      if (newQuantity > product.quantity) {
        alert(`Only ${product.quantity} items available in stock`);
        return;
      }
      
      // Call the update function
      onUpdateReservation(reservation.id, newQuantity);
    }
    
    // Exit editing mode
    setIsEditing(prev => ({
      ...prev,
      [reservation.id]: false
    }));
  };

  // Cancel editing
  const cancelEdit = (reservationId) => {
    // Remove from edited quantities
    setEditedQuantities(prev => {
      const newEdited = { ...prev };
      delete newEdited[reservationId];
      return newEdited;
    });
    
    // Exit editing mode
    setIsEditing(prev => ({
      ...prev,
      [reservationId]: false
    }));
  };

  return (
    <div className="admin-reservations-table-container">
      {reservations.length === 0 ? (
        <div className="no-reservations">
          <h3>No reservations found</h3>
          <p>There are currently no reservations to manage.</p>
        </div>
      ) : (
        <div className="admin-reservations-grouped">
          {Object.entries(groupedReservations).map(([customerName, customerReservations]) => {
            // Calculate totals for this customer
            const totalItems = customerReservations.reduce((sum, res) => sum + res.quantity, 0);
            
            // Get discount and VAT info from first reservation (assuming they're the same for all)
            const firstReservation = customerReservations[0];
            const discount = firstReservation.discount || 0;
            const vat = firstReservation.vat || 0;
            
            // Calculate subtotal, discount amount, and VAT amount
            const subtotal = customerReservations.reduce((sum, res) => sum + (res.quantity * res.price), 0);
            const discountAmount = Math.min(discount, subtotal);
            const afterDiscount = subtotal - discountAmount;
            const vatAmount = vat > 0 ? afterDiscount * 0.07 : 0;
            const finalTotal = afterDiscount + vatAmount;
            
            return (
              <div key={customerName} className="reservation-group">
                <div className="group-header">
                  <h3>{customerName}</h3>
                  <div className="group-summary">
                    <span>Total Items: {totalItems}</span>
                    <span>Subtotal: ฿{subtotal.toFixed(2)}</span>
                    {discount > 0 && <span>Discount: -฿{discountAmount.toFixed(2)}</span>}
                    <span>After Discount: ฿{afterDiscount.toFixed(2)}</span>
                    {vat > 0 && <span>VAT 7%: ฿{vatAmount.toFixed(2)}</span>}
                    <span>Total Amount: ฿{finalTotal.toFixed(2)}</span>
                    <span>Sales Person: {customerReservations[0].salesPerson}</span>
                  </div>
                </div>
                
                <table className="admin-reservations-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Amount</th>
                      <th>Reservation Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerReservations.map((reservation) => {
                      const isCurrentlyEditing = isEditing[reservation.id];
                      const editedQuantity = editedQuantities[reservation.id];
                      const displayQuantity = isCurrentlyEditing ? (editedQuantity !== undefined ? editedQuantity : reservation.quantity) : reservation.quantity;
                      const amount = displayQuantity * reservation.price;
                      
                      return (
                        <tr key={reservation.id}>
                          <td>{reservation.productName}</td>
                          <td>
                            {isCurrentlyEditing ? (
                              <input
                                type="number"
                                min="1"
                                value={displayQuantity}
                                onChange={(e) => handleQuantityChange(reservation.id, e.target.value)}
                                className="quantity-input"
                              />
                            ) : (
                              displayQuantity
                            )}
                          </td>
                          <td>฿{reservation.price.toFixed(2)}</td>
                          <td>฿{amount.toFixed(2)}</td>
                          <td>{reservation.date}</td>
                          <td>
                            <span className={`status-badge ${reservation.status || 'pending'}`}>
                              {reservation.status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            {!reservation.status || reservation.status === 'pending' ? (
                              isCurrentlyEditing ? (
                                <>
                                  <button 
                                    className="action-btn save-btn"
                                    onClick={() => saveEdit(reservation)}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    className="action-btn cancel-btn"
                                    onClick={() => cancelEdit(reservation.id)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="action-btn edit-btn"
                                    onClick={() => startEditing(reservation.id)}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="action-btn accept-btn"
                                    onClick={() => onAcceptReservation(reservation)}
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    className="action-btn cancel-btn"
                                    onClick={() => onCancelReservation(reservation.id)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )
                            ) : (
                              <button 
                                className="action-btn cancel-btn"
                                onClick={() => onCancelReservation(reservation.id)}
                                disabled={reservation.status === 'completed'}
                              >
                                {reservation.status === 'completed' ? 'Completed' : 'Cancel'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReservationManagement;