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

## Excel Data Import

To use the Excel import feature in a real application:

1. Create an Excel file with the following columns:
   - `sku`: Product SKU (optional)
   - `name`: Product name
   - `category`: Product category
   - `price`: Product price
   - `quantity`: Available quantity

2. Save the file in .xlsx format

3. In the admin panel, click "Choose Excel File" and select your file

4. The system will automatically parse and import your stock data

A sample template is available at `public/stock-template.csv` which can be opened in Excel or converted to XLSX format.

## Technical Details

This application is built with:
- React for the frontend
- Vite for fast development
- CSS for beautiful styling
- xlsx library for Excel file parsing

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

## Admin Access

To access the admin panel:
1. Click "Admin View" in the navigation bar
2. Enter password: `admin123`

In the admin panel, you can:
- Upload stock data from Excel files
- View and manage reservations
- Replenish stock quantities
- View inventory summaries and charts