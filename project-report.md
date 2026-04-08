# SnapShop Project Report

## Question 1: Goals, Business Forecast, and Offerings

### Goals of the e-commerce website

The goal of the SnapShop website is to create a practical online business that sells useful creator gadgets and smart accessories to customers in Uganda. The website is designed to:

1. attract students, creators, and professionals who need reliable tech accessories;
2. present products clearly with simple descriptions and visible prices;
3. allow customers to browse products by category, add items to a cart, and proceed to payment;
4. build trust through accurate contact information, a FAQ page, and a clean checkout process;
5. support business growth through branding, customer convenience, and digital marketing.

### Business forecast

SnapShop is expected to begin as a small but growing online retail business focused on affordable, fast-moving tech accessories. The first-year forecast is:

- Average monthly visitors: 4,500
- Estimated conversion rate: 2.2%
- Average order value: UGX 185,000
- Estimated annual orders: about 1,188
- Estimated annual sales revenue: about UGX 219,780,000

The forecast assumes that traffic will come from social media marketing, word of mouth, student communities, and search engine visibility. As brand awareness improves, sales should increase because the products are practical and frequently needed.

### What the business will offer

SnapShop will offer:

- creator gear such as ring lights, tripods, and webcams;
- audio products such as earbuds and Bluetooth speakers;
- power products such as power banks and charging accessories;
- workspace tools such as tablet stands;
- smart home accessories such as smart plugs.

In addition to products, the business will offer:

- a convenient online ordering process;
- visible prices and product descriptions;
- local delivery options;
- customer support through phone, email, and contact form;
- payment options such as mobile money, card, and cash on delivery for selected orders;
- secure online payment processing through Pesapal (API 3.0), supporting MTN Mobile Money, Airtel Money, Visa, and Mastercard;
- real-time order tracking and payment confirmation via Pesapal IPN (Instant Payment Notification).

## Question 2: Factors That Could Influence the Performance of the E-commerce Business

Several factors can influence the performance of SnapShop:

1. **Internet accessibility and speed**  
   Slow internet can reduce page loading speed and discourage customers from browsing or checking out.

2. **Website usability**  
   If navigation is confusing or the checkout process is difficult, customers may abandon the website before completing a purchase.

3. **Product pricing**  
   Prices must remain competitive. If competitors offer lower prices or better bundles, sales may reduce.

4. **Product quality and trust**  
   Poor-quality goods or unclear descriptions can damage customer confidence and reduce repeat business.

5. **Digital marketing effectiveness**  
   Social media promotions, search engine optimization, and brand visibility directly affect website traffic and sales.

6. **Payment convenience**  
   Customers are more likely to buy when payment methods are simple, trusted, and familiar, especially mobile money. SnapShop integrates Pesapal, a PCI-DSS compliant payment gateway widely adopted in East Africa, supporting MTN Mobile Money, Airtel Money, Visa, and Mastercard within a single checkout flow.

7. **Delivery efficiency**  
   Delayed deliveries or poor order tracking may lead to customer dissatisfaction and negative recommendations.

8. **Customer service**  
   Fast responses to questions, complaints, and returns improve loyalty and strengthen the business image.

9. **Security and privacy**  
   Customers must feel that their personal information and payment process are safe.

10. **Economic conditions**  
    Inflation, reduced customer income, and changing market demand can affect purchasing behaviour.

### Conclusion

SnapShop is designed as a modern, practical, and customer-friendly e-commerce business. Its performance will depend on strong website usability, trusted service, competitive pricing, reliable delivery, and consistent digital marketing.

## Technical Implementation Summary

### Payment Gateway — Pesapal API 3.0

SnapShop integrates with Pesapal's API 3.0 (JSON) for secure payment processing. The integration covers the full payment lifecycle:

1. **Authentication** — Server-side token generation using consumer key and secret (tokens valid for 5 minutes).
2. **IPN Registration** — Automatic registration of Instant Payment Notification URLs so SnapShop receives real-time payment status updates.
3. **Order Submission** — When a customer clicks "Pay with Pesapal", the server creates an order, submits it to Pesapal with billing details, and receives a payment redirect URL.
4. **Payment Experience** — The Pesapal payment form loads inside an iframe on the payment page for a seamless checkout without leaving the website.
5. **Callback Handling** — After payment, Pesapal redirects the customer back to SnapShop where the transaction status is verified automatically.
6. **IPN Processing** — Pesapal sends background notifications to confirm payment status, ensuring orders are updated even if the customer closes the browser.
7. **Fallback** — If Pesapal is unavailable, the system gracefully falls back to direct order creation.

**Sandbox credentials** (Ugandan Merchant) are used for development and demonstration:
- Consumer Key: `TDpigBOOhs+zAl8cwH2Fl82jJGyD8xev`
- Sandbox URL: `https://cybqa.pesapal.com/pesapalv3`

### Website Structure

| Page | Purpose |
|------|---------|
| index.html | Homepage with hero, categories, featured products, testimonials, and poll |
| shop.html | Full product catalog with search, filters, and sorting |
| product.html | Individual product detail with related products |
| cart.html | Shopping cart with quantity controls and order summary |
| checkout.html | Delivery details form with order review |
| payment.html | Pesapal secure payment with iframe integration |
| success.html | Order confirmation with reference and tracking details |
| about.html | Company mission, vision, and target customers |
| contact.html | Contact form, phone, email, address, and social links |
| faq.html | 10 frequently asked questions with answers |
| login.html | User authentication with demo account access |
| register.html | New customer and vendor registration |
| dashboard.html | Role-based dashboard (Admin, Vendor, Customer) |
| sitemap.html | Complete website hierarchy and page structure |
| 404.html | Custom error page for missing routes |

### Technology Stack

- **Frontend**: HTML5, CSS3 (custom design system), Vanilla JavaScript
- **Backend**: Node.js 20+, Express.js
- **Database**: PostgreSQL with Prisma ORM (Railway-hosted)
- **Payment**: Pesapal API 3.0 (sandbox)
- **Authentication**: JWT tokens with role-based access (Admin, Vendor, Customer)
- **Deployment**: Railway.app
