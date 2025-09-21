# Stock Reservation Application

A beautiful and user-friendly web application for viewing stock inventory and making product reservations.

## Features

- View stock inventory in a clean, responsive table
- Reserve products with a simple form
- Upload stock data from Excel files
- Real-time stock quantity updates
- Responsive design that works on all devices

## How to Use

1. Upload an Excel file with your stock data (in a real application)
2. Browse available products in the stock table
3. Click "Reserve" on any product to open the reservation form
4. Enter your details and quantity to confirm your reservation
5. View your confirmed reservations in the reservations section

## Sample Data

For demonstration purposes, the application includes sample stock data:
- Smartphone X ($699, 25 in stock)
- Laptop Pro ($1299, 10 in stock)
- Wireless Headphones ($199, 40 in stock)
- Smart Watch ($299, 15 in stock)
- Tablet Air ($499, 30 in stock)

## Technical Details

This application is built with:
- React for the frontend
- Vite for fast development
- CSS for beautiful styling
- xlsx library for Excel file parsing (in a real implementation)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to http://localhost:3000

## Note on Excel Integration

In this demo version, the Excel upload feature simulates the process. In a full implementation, it would parse actual Excel files using the xlsx library.