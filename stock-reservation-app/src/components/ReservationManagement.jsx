import React, { useState, useMemo } from 'react';

const ReservationManagement = ({ reservations, stockData, onCancelReservation, onAcceptReservation, onUpdateReservation }) => {
  // sorting state: { key, direction }
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  // Create a map of product names and available quantities for easy lookup
  const productMap = {};
  stockData.forEach(item => {
    productMap[item.id] = {
      name: item.name,
      availableQuantity: item.quantity
    };
  });

  // Group reservations by customer name
  // group and optionally sort reservations per customer
  const groupedReservations = useMemo(() => {
    const groups = {};
    reservations.forEach(reservation => {
      if (!groups[reservation.customerName]) groups[reservation.customerName] = [];
      groups[reservation.customerName].push(reservation);
    });

    // apply sorting within each customer's list if a key is provided
    if (sortConfig.key) {
      Object.keys(groups).forEach(customer => {
        groups[customer].sort((a, b) => {
          const ka = a[sortConfig.key];
          const kb = b[sortConfig.key];

          // handle numbers and strings
          if (typeof ka === 'number' && typeof kb === 'number') {
            return sortConfig.direction === 'asc' ? ka - kb : kb - ka;
          }

          const sa = (ka || '') + '';
          const sb = (kb || '') + '';
          return sortConfig.direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        });
      });
    }

    return groups;
  }, [reservations, sortConfig]);

  // Handle quantity change
  const handleQuantityChange = (reservationId, newQuantity) => {
    // Not used anymore since editing is removed
  };

  // Toggle sort for a column
  const toggleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Flatten grouped reservations to CSV rows
  const buildCsvRows = () => {
    const rows = [];
    Object.entries(groupedReservations).forEach(([customerName, customerReservations]) => {
      customerReservations.forEach(r => {
        rows.push({
          customer_name: customerName,
          reservation_id: r.id,
          product_sku: r.productSku || r.product_sku || '',
          product_name: r.productName,
          reserved_quantity: r.quantity,
          price: r.price || 0,
          amount: (r.quantity * (r.price || 0)),
          sales_person: r.salesPerson || r.sales_person || '',
          discount: r.discount || 0,
          vat: r.vat || 0,
          status: r.status || '',
          date: r.date || ''
        });
      });
    });
    return rows;
  };

  const exportCsv = () => {
      try {
        const rows = buildCsvRows();
        if (rows.length === 0) {
          alert('No reservations to export');
          return;
        }

        const headers = Object.keys(rows[0]);
        const csv = [
          headers.join(','),
          ...rows.map(r =>
            headers
              .map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`)
              .join(',')
          )
        ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservations_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export CSV: ' + (e.message || e));
    }
  };

  return (
    <div className="admin-reservations-table-container">
      <div className="admin-reservations-actions" style={{ marginBottom: 12 }}>
        <button className="btn btn-secondary" onClick={exportCsv}>Export Reservations (CSV)</button>
      </div>
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
                      <th onClick={() => toggleSort('productName')} style={{ cursor: 'pointer' }}>Product {sortConfig.key === 'productName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('quantity')} style={{ cursor: 'pointer' }}>Quantity {sortConfig.key === 'quantity' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('price')} style={{ cursor: 'pointer' }}>Price {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th>Amount</th>
                      <th onClick={() => toggleSort('salesPerson')} style={{ cursor: 'pointer' }}>Sales Person {sortConfig.key === 'salesPerson' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('discount')} style={{ cursor: 'pointer' }}>Discount {sortConfig.key === 'discount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('vat')} style={{ cursor: 'pointer' }}>VAT {sortConfig.key === 'vat' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Reservation Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerReservations.map((reservation) => {
                      const amount = reservation.quantity * reservation.price;
                      
                      return (
                        <tr key={reservation.id}>
                          <td>{reservation.productName}</td>
                          <td>{reservation.quantity}</td>
                          <td>฿{reservation.price.toFixed(2)}</td>
                          <td>฿{amount.toFixed(2)}</td>
                          <td>{reservation.salesPerson || reservation.sales_person || '-'}</td>
                          <td>{reservation.discount ? `฿${Number(reservation.discount).toFixed(2)}` : '-'}</td>
                          <td>{reservation.vat ? `${Number(reservation.vat).toFixed(2)}%` : '-'}</td>
                          <td>{reservation.date}</td>
                          <td>
                            <span className={`status-badge ${reservation.status || 'pending'}`}>
                              {reservation.status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            {!reservation.status || reservation.status === 'pending' ? (
                              <>
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