# SnapShop E-Commerce Project Examination Submission

**Examinations for January – April 2026**  
**Examinations Project**  
**Course Code:** CIT 7201/ IT 501  
**Course Name:** Electronic Commerce Technologies  
**Programme(s):** MIT/ MIS/ MSc. Comp. Sc.  
**School(s):** SCHOOL OF COMPUTING AND ENGINEERING  
**Year of Study:** Year 1  
**Semester:** Two  
**Project Examination Date:** April 2026  
**Duration:** 5 Days  

**Student Name:** [Your Full Name]  
**Student ID:** [Your Student ID]  
**Submission Date:** [Date]  

**Website URL:** https://snapshop.divinefishers.com/  

---

## Instructions Followed
1. **Prepared a functional e-Commerce website**: SnapShop is a fully operational multi-vendor e-commerce marketplace deployed on Railway, with live functionality including product listings, user authentication, shopping cart, secure payments via Pesapal, and order management.
2. **Used the guide provided and other guides**: The development followed standard e-commerce best practices, including the Pesapal API integration guide created as part of this project, and referenced industry standards for Node.js/Express applications.
3. **Referred to the marking e-Commerce marking rubric**: The website design incorporates all key rubric elements such as user interface, functionality, security, payment integration, and scalability.
4. **Upload the address of your website**: The live website is accessible at https://snapshop.divinefishers.com/ and has been deployed for examination purposes.

---

## Introduction
This project examination demonstrates the development of a viable e-commerce business idea. SnapShop serves as a platform for Ugandan vendors to sell products online, promoting local entrepreneurship and digital commerce. The implementation includes modern technologies and secure payment processing, providing a foundation for a real-world business venture.

---

## Question 1
**Define the goals of your ecommerce website. What is your business forecast and what will you be offering?**  
*(10 Marks)*

### Goals of SnapShop E-Commerce Website
SnapShop is a multi-vendor e-commerce marketplace designed to connect local vendors in Uganda with customers seeking a wide variety of products. The primary goals are:

1. **Provide a Platform for Vendors**: Enable small and medium-sized businesses to list and sell their products online without the need for their own e-commerce infrastructure.
2. **Offer a Seamless Shopping Experience**: Create an intuitive, secure, and user-friendly platform for customers to browse, compare, and purchase products from multiple vendors.
3. **Promote Local Economy**: Focus on Ugandan vendors and customers, supporting local businesses and reducing reliance on international e-commerce giants.
4. **Ensure Secure Transactions**: Integrate reliable payment processing (Pesapal API) to build trust and facilitate smooth financial transactions.
5. **Scale and Grow**: Build a scalable platform that can handle increasing traffic, vendors, and product listings while maintaining performance and security.

### Business Forecast
Based on Uganda's growing digital economy and increasing internet penetration (estimated at 50% of the population), SnapShop aims to capture a significant share of the local e-commerce market. Forecast projections for the first three years:

- **Year 1**: 500 active vendors, 10,000 registered customers, $50,000 in total sales, achieving break-even.
- **Year 2**: 1,500 vendors, 50,000 customers, $500,000 in sales, with 20% profit margin.
- **Year 3**: 3,000 vendors, 150,000 customers, $2 million in sales, expanding to regional markets in East Africa.

Growth drivers include partnerships with local businesses, marketing campaigns, and continuous platform improvements.

### What We Will Be Offering
SnapShop offers a comprehensive e-commerce solution including:

- **Product Listings**: Vendors can upload products with images, descriptions, prices, and categories.
- **Multi-Vendor Marketplace**: Customers can shop from multiple vendors in one place.
- **Secure Payments**: Integration with Pesapal for UGX transactions, supporting mobile money and cards.
- **User Accounts**: Separate dashboards for customers (order history, cart persistence) and vendors (product management, sales analytics).
- **Search and Filtering**: Advanced search, category browsing, and product recommendations.
- **Order Management**: Full order lifecycle from placement to delivery tracking.
- **Admin Panel**: Platform management for administrators to oversee vendors, products, and payments.

---

## Question 2
**What factors could influence the performance of your eCommerce business?**  
*(10 Marks)*

Several internal and external factors can influence the performance of SnapShop's e-commerce business:

### Internal Factors
1. **Platform Reliability**: Server uptime, load times, and scalability. Downtime or slow performance can lead to lost sales.
2. **User Experience (UX)**: Intuitive design, mobile responsiveness, and ease of navigation. Poor UX increases bounce rates.
3. **Product Quality and Vendor Management**: Ensuring vendors provide accurate listings and timely deliveries. Poor vendor performance affects customer satisfaction.
4. **Security and Trust**: Secure payment processing and data protection. Breaches can erode trust and lead to legal issues.
5. **Marketing and Customer Acquisition**: Effective SEO, social media, and email campaigns to drive traffic and conversions.
6. **Operational Efficiency**: Streamlined order fulfillment, inventory management, and customer support.

### External Factors
1. **Market Competition**: Competition from platforms like Jumia, Kilimall, or international sites like Amazon. Differentiation through local focus is key.
2. **Economic Conditions**: Inflation, currency fluctuations (UGX), and consumer spending power in Uganda.
3. **Regulatory Environment**: Compliance with Ugandan e-commerce laws, data protection (similar to GDPR), and payment regulations.
4. **Technology Trends**: Adoption of AI for recommendations, mobile payments, and emerging technologies like blockchain for security.
5. **Logistics and Infrastructure**: Reliable delivery services, internet connectivity, and mobile network coverage in Uganda.
6. **Global Events**: Pandemics, political instability, or economic downturns that affect consumer behavior and supply chains.

To mitigate these, SnapShop will conduct regular performance audits, invest in technology upgrades, and adapt to market changes.

---

## Question 3
**Design and develop an e-Commerce website. Use the following guidance.**  
*(80 Marks)*

### Website Design and Development Overview
SnapShop is a fully functional e-commerce marketplace built using modern web technologies. The development follows best practices for scalability, security, and user experience.

#### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript for responsive design and interactivity.
- **Backend**: Node.js with Express.js for server-side logic and API endpoints.
- **Database**: PostgreSQL with Prisma ORM for data modeling and queries.
- **Payments**: Pesapal API 3.0 for secure UGX transactions.
- **Image Storage**: Cloudinary for persistent product images (fallback to local storage).
- **Hosting**: Railway for deployment with ephemeral file handling.

#### Key Features Implemented
1. **User Authentication**: Login/register with JWT tokens, role-based access (Customer, Vendor, Admin).
2. **Product Management**: Vendors can add/edit products with multi-image upload, categories, and pricing.
3. **Shopping Cart**: Persistent cart with server-side storage, merge on login.
4. **Checkout and Payments**: Secure Pesapal integration with iframe embedding for on-page payments.
5. **Order Management**: Full order lifecycle with status tracking and IPN handling.
6. **Admin Dashboard**: Vendor and product oversight, payment monitoring.
7. **Responsive Design**: Mobile-first CSS with grid layouts and modern UI elements.

#### Development Process
1. **Planning**: Defined requirements, user stories, and database schema.
2. **Backend Development**: Built API routes, services, and middleware for authentication and payments.
3. **Frontend Development**: Created HTML pages, styled with CSS, added JS for interactivity.
4. **Integration**: Connected frontend to backend APIs, implemented payment flow.
5. **Testing**: Manual testing of features, error handling, and performance.
6. **Deployment**: Hosted on Railway with environment variables for security.

#### Code Structure
- `src/app.js`: Main Express app setup.
- `src/routes/`: API endpoints for auth, products, orders, etc.
- `src/services/`: Business logic like Pesapal integration and store management.
- `src/lib/`: Utilities like Prisma client and Cloudinary uploader.
- `public/`: Static assets (CSS, JS, images).
- `views/`: HTML pages for the frontend.

#### Security Measures
- Input validation and sanitization.
- JWT for session management.
- HTTPS enforcement.
- Secure payment handling via Pesapal.

#### Performance Optimizations
- Image compression via Cloudinary.
- Database indexing with Prisma.
- Caching for frequently accessed data.
- Responsive images and lazy loading.

The website is live at https://snapshop.divinefishers.com/ and demonstrates a complete e-commerce solution tailored for the Ugandan market.