import React from 'react';

const ExcelUpload = ({ onUpload }) => {
  const handleFileUpload = (event) => {
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
      ];
      
      onUpload(sampleData);
    } else {
      alert('Please upload a valid Excel file (.xlsx)');
    }
  };

  return (
    <div className="excel-upload">
      <h3>Upload Stock Data</h3>
      <p>Upload an Excel file to update stock information</p>
      <label htmlFor="excel-file" className="upload-btn">
        Upload Excel File
      </label>
      <input
        id="excel-file"
        type="file"
        accept=".xlsx"
        onChange={handleFileUpload}
        className="file-input"
      />
      <p><small>Note: In a real application, this would parse actual Excel files</small></p>
    </div>
  );
};

export default ExcelUpload;