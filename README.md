# 🤖 AI Chatbot

##  Overview

AI Chatbot is a web-based application developed using Python and Flask. It allows users to interact with an AI assistant through a clean and user-friendly interface. The chatbot generates intelligent responses using the Groq AI API and stores conversation history for future reference.

##  Features

-  AI-powered chatbot
-  Chat history management
-  Search previous conversations
-  Pin important chats
-  Delete chat history
-  Dark and Light themes
-  File upload support
-  Responsive user interface

##  Technologies Used

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Python
- Flask

### Database
- SQLite

### AI Integration
- Groq API

## 📁 Project Structure

AI-Chatbot/
│
├── app.py
├── requirements.txt
├── Procfile
├── database/
│   └── database.py
├── services/
│   └── ai_service.py
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── templates/
│   └── index.html
└── uploads/


##  How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/KanumuriHimasri1709/AI-Chatbot.git
```

### 2. Open the project folder

```bash
cd AI-Chatbot
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create a `.env` file

```env
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key
```

### 5. Run the application

```bash
python app.py
```

Open your browser and visit:

```
http://127.0.0.1:5000
```

##  Future Improvements

- Voice Input
- Voice Output
- PDF Summarization
- Image Generation
- User Authentication
- Cloud Database
- Mobile Application


##  Author

**KANUMURI HIMA SRI**

- GitHub: https://github.com/KanumuriHimasri1709
- LinkedIn: https://www.linkedin.com/in/hima-sri-kanumuri-8a9030378


##  License

This project is developed for educational and learning purposes.
