# AREL Tech Chat - Real-Time Communication Platform

A modern real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO. This platform enables AREL students and developers to connect, share ideas, and collaborate in real-time.

![AREL Tech Chat https://real-time-communication-with-socket-pink.vercel.app/)

## 🌟 Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure authentication with Clerk
- **Modern UI**: Clean and responsive interface built with Tailwind CSS
- **Message History**: Persistent chat history stored in MongoDB
- **User Presence**: See who's online and active
- **Private Conversations**: One-on-one messaging capability
- **Profile Management**: User profiles with avatars and display names
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Tech Stack

### Frontend
- React with Vite
- Clerk for authentication
- Socket.IO client for real-time communication
- Tailwind CSS for styling
- React Router for navigation

### Backend
- Node.js & Express
- Socket.IO for real-time events
- MongoDB for data persistence
- Clerk SDK for auth verification
- CORS for secure cross-origin requests

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas connection)
- Clerk account for authentication
- Git

### Environment Variables

#### Backend (.env)
\`\`\`env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
\`\`\`

#### Frontend (.env)
\`\`\`env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000
VITE_CLERK_JWT_TEMPLATE=integration_fallback
VITE_SOCKET_URL=http://localhost:5000
\`\`\`

### Installation & Setup

1. Clone the repository
\`\`\`bash
git clone https://github.com/Ngong2/real-time-communication-with-socket-io-Ngong2.git
cd real-time-communication-with-socket-io-Ngong2
\`\`\`

2. Install backend dependencies
\`\`\`bash
cd refugeechat-backend
npm install
\`\`\`

3. Install frontend dependencies
\`\`\`bash
cd ../refugeechat-frontend
npm install
\`\`\`

4. Start the backend server
\`\`\`bash
cd ../refugeechat-backend
npm run dev
\`\`\`

5. In a new terminal, start the frontend development server
\`\`\`bash
cd ../refugeechat-frontend
npm run dev
\`\`\`

The application should now be running at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 🔒 Clerk Setup

1. Create a Clerk account at https://clerk.com
2. Create a new application in the Clerk dashboard
3. Configure your JWT template:
   - Go to JWT Templates in your Clerk dashboard
   - Create a new template named "integration_fallback"
   - Add the following claims:
     \`\`\`json
     {
       "userId": "{{user.id}}",
       "email": "{{user.primary_email_address}}",
       "name": "{{user.first_name}} {{user.last_name}}"
     }
     \`\`\`
4. Copy your Clerk keys to the respective .env files

## 🌐 Deployment

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure environment variables
4. Use the following build settings:
   - Build Command: \`npm install\`
   - Start Command: \`npm start\`

### Frontend Deployment (Vercel)

1. Import your project to Vercel
2. Configure environment variables
3. Deploy with default settings
4. Update the backend URL in frontend environment variables

## 📱 Usage

1. Sign in using your Clerk authentication
2. Access your dashboard
3. Start or continue conversations
4. Send and receive real-time messages
5. View user profiles and online status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- AREL University for the inspiration
- All contributors and students involved
- Open source community for the amazing tools

## 📧 Contact

For any queries or support, please reach out to:
- Email: [your-email@example.com]
- GitHub: [@Ngong2](https://github.com/Ngong2)

---

⭐ Star this repository if you find it helpful!