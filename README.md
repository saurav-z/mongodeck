# MongoDeck

<div align="center">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</div>

<br />

**MongoDeck** is a modern, responsive, and lightweight web-based GUI for MongoDB. Built with performance and aesthetics in mind, it provides a seamless experience for managing your data, whether you're working locally or connecting to remote clusters.

**Repository:** [github.com/saurav-z/mongodeck](https://github.com/saurav-z/mongodeck)

## Features

*   **Responsive Design**: Fully responsive layout that works on desktop, tablet, and mobile.
*   **Modern UI**: Sleek, dark-mode interface built with Tailwind CSS.
*   **Connection Management**: Support for standard host/port connections and full connection URI strings (SRV).
*   **Multi-View Support**: View your documents in JSON, Table, or Card formats.
*   **CRUD Operations**: Easily create, read, update, and delete documents and collections.
*   **Advanced Filtering**: Native MongoDB JSON query filtering support.
*   **Dashboard**: Visual overview of your database status, storage distribution, and connection stats.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   A running MongoDB instance (Local or Atlas)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/saurav-z/mongodeck.git
    cd mongodeck
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

You can start the application in two modes:

**Production Mode (Recommended)**
Builds the frontend and serves it via the backend Express server.
```bash
npm start
```
Access the app at `http://localhost:3001`

**Development Mode**
Runs the Vite frontend server and Express backend concurrently with hot-reloading.
```bash
npm run dev
```
Access the app at `http://localhost:5173`

## Tech Stack

*   **Frontend**: React, Vite, Lucide React, Recharts
*   **Backend**: Node.js, Express
*   **Database Driver**: MongoDB Native Driver
*   **Styling**: Tailwind CSS

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built by [saurav-z](https://github.com/saurav-z)
