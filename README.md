![Wasalny Banner](public/social-preview.png)

# Wasalny | وصلني 🚚

[![Frontend CI](https://github.com/dev-mustafa-hussin/wasalny/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-mustafa-hussin/wasalny/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://wasalny-six.vercel.app/)

**Wasalny** (وصلني) is a professional, high-performance logistics and delivery management ecosystem. Designed to bridge the gap between merchants, drivers, and customers, it provides real-time tracking, intelligent order routing, and comprehensive management dashboards.

[**🌐 Live Demo**](https://wasalny-six.vercel.app/) | [**📄 العربية (Documentation)**](شرح_التطبيق/00_المقدمة_والاتصال.md)

---

## 🚀 Key Modules & Roles

### 🏛️ Admin Control Center

- **System Overview**: High-level analytics of total orders, revenue, and active users.
- **User Management**: Control access levels for admins, merchants, and drivers.
- **System Configuration**: Manage global settings, service areas, and fee structures.

### 🏪 Merchant Portal

- **Inventory Management**: Add and manage products with real-time stock updates.
- **Order Pipeline**: Track orders from "Pending" to "Delivered" with granular status control.
- **Sales Analytics**: View detailed reports on store performance and popular products.

### 🚴 Driver Application

- **Live Dispatch**: Receive instant notifications for new delivery requests in the vicinity.
- **Smart Navigation**: Optimized routing powered by Mapbox for faster deliveries.
- **Earnings Tracker**: Keep track of completed deliveries and calculated commissions.

### 👤 Customer Experience

- **Seamless Ordering**: Intuitive interface for browsing stores and placing orders.
- **Real-time Tracking**: Watch your delivery progress live on the map.
- **Order History**: Easy access to previous orders and invoice downloads.

---

## 🛠️ Tech Stack

- **Core**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Auth, Database, Storage, Real-time)
- **Mapping & Geospatial**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- **UI Framework**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Data Fetching**: [Tanstack Query (React Query)](https://tanstack.com/query/latest)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) + [Zod Validation](https://zod.dev/)

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **PackageManager**: `npm` or `bun`

### Installation

1. **Clone the Project**

   ```bash
   git clone https://github.com/dev-mustafa-hussin/wasalny.git
   cd wasalny
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_MAPBOX_TOKEN=your_mapbox_access_token
   ```

4. **Launch Development Environment**
   ```bash
   npm run dev
   ```

---

## 📖 Detailed Guides (Arabic)

We provide comprehensive documentation in Arabic to help you get started with each module:

- [المقدمة والاتصال](شرح_التطبيق/00_المقدمة_والاتصال.md)
- [دليل الإدارة (Admin)](شرح_التطبيق/01_دليل_الادارة.md)
- [دليل المتاجر (Merchants)](شرح_التطبيق/02_دليل_المتاجر.md)
- [دليل السائقين (Drivers)](شرح_التطبيق/03_دليل_السائقين.md)
- [دليل العملاء (Customers)](شرح_التطبيق/04_دليل_العملاء.md)

---

## 🤝 Contributing

Wasalny is an open-source project and we love contributions! Submitting a Pull Request is the best way to help.

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ by <a href="https://github.com/dev-mustafa-hussin">Mustafa Hussin</a></p>
