# 💬 ConnectSphere — Real-Time Group Chat Application

ConnectSphere is a web-based group chat application that allows registered users to create groups, add members, and communicate through real-time messaging.

## 🌐 Project Links

- **Live Application:** https://connectsphere-pd7d.onrender.com
- **GitHub Repository:** https://github.com/gunavardhan8899-wq/ConnectSphere

## ✨ Features

- User registration and login
- Create and manage group conversations
- Add registered users to groups
- Real-time messaging using Socket.IO
- Message history stored in MongoDB
- Typing indicators
- Group search and member lists
- Light and dark themes
- Responsive user interface

## 🛠️ Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Real-time communication:** Socket.IO
- **Database:** MongoDB and MongoDB Atlas
- **Deployment:** Render
- **Version control:** Git and GitHub

## 📁 Project Structure

```text
ConnectSphere/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── main.css
│   └── js/
│       └── app.js
├── server/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## ⚙️ Requirements

- Node.js 18 or later
- npm
- MongoDB Atlas account or a local MongoDB instance

## 🚀 How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/gunavardhan8899-wq/ConnectSphere.git
```

### 2. Enter the project directory

```bash
cd ConnectSphere/ConnectSphere
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and configure your database connection and secret.

Example configuration:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
NODE_ENV=development
```

Replace the example values with your own settings. Never upload your actual `.env` file or private credentials to GitHub.

### 5. Start the application

```bash
npm start
```

Open your browser at:

http://localhost:3000

## 🔒 Security

- Keep database credentials and JWT secrets private.
- Do not upload `.env` or `node_modules` to GitHub.
- Configure database network access securely.

## 👨‍💻 Author

**Guna Vardhan**

GitHub: https://github.com/gunavardhan8899-wq

## 📄 License

Created for educational and project demonstration purposes.# ConnectSphere
