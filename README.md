# Firebase Backend Application

Welcome to the DNA Community Backend!  
This project is a backend application built with **Node.js**, **TypeScript**, and **Firebase (Firestore)**.  
It manages users, workshops, forums, notifications, and much more for your community platform.

---

## 🚀 Getting Started

### 1. **Clone the Repository**
```bash
git clone https://github.com/jotinho3/dna-community-back.git
cd dna-community-back/firebase-backend-app
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Environment Setup**

- **`.env` file:**  
  You must create a `.env` file in the project root.  
  This file should contain your JWT secret:
  ```
  JWT_SECRET=your_jwt_secret
  ```
  > ⚠️ **Request the JWT token from the project admin if you don't have it.**

- **`serviceAccountKey.json`:**  
  Download your Firebase service account key from the Firebase Console.  
  Place it in the root of the project (`firebase-backend-app/serviceAccountKey.json`).  
  > ⚠️ **Request this file from the project admin if you don't have it.**

### 4. **Run the Application**
```bash
npm run start
```
or

```bash
npm run dev
```
or
```bash
npx ts-node-dev src/index.ts
```

---

## 📁 Project Structure

```
src/
├── controllers/      # Request handlers for each entity
├── entities/         # Data models (TypeScript interfaces)
├── routes/           # API route definitions
├── services/         # Business logic and Firestore interactions
├── utils/            # Utility functions (Firebase initialization, etc.)
└── index.ts          # Application entry point
```

---

## 🌐 API Endpoints

- **Auth:** `/api/auth/register`, `/api/auth/login`
- **Users:** `/api/users`
- **Workshops:** `/api/workshops`
- **Forums:** `/api/forums`
- **Posts:** `/api/posts`
- **Responses:** `/api/responses`
- ...and more!

> See the files in `src/routes/` for all available endpoints.

---

## 🛡️ Security

- **Never commit your `.env` or `serviceAccountKey.json` to Git!**
- These files are ignored by `.gitignore` for your safety.

---

## 🤝 Contributing

Contributions are welcome!  
Open an issue or submit a pull request for improvements or new features.

---

## 📄 License

This project is licensed under the MIT License.  
See the LICENSE file for details.

---

**Made with ❤️ by João Pedro Marques Chaves and contributors to Infosys!!!**