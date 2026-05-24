# Issue Tracking System API

A robust RESTful API built with **Node.js**, **Express.js**, and **PostgreSQL** to manage software bugs and feature requests. This project features JWT-based Authentication, Role-Based Access Control (RBAC), advanced filtering/sorting, and optimized database queries without traditional table joins.

## 🚀 Features

- **Authentication & Authorization**: Secure registration and login using JWT (JSON Web Tokens) and bcrypt password hashing.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `maintainer` and `contributor` roles.
- **Issue Management**: Full CRUD operations for tracking system issues.
- **Advanced Querying**: Supports filtering issues by `type` or `status`, and sorting by creation date (`newest`/`oldest`).
- Code fully work & test on Postman. Like Registration, Login, Create, Get All, Get Single, Update, Single & Delete.
  
## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (pg pool)
- **Security**: JWT, Bcrypt
- **Environment**: Dotenv

---

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/) (Local instance or Hosted Supabase/Neon)
