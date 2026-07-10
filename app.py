import os
from dotenv import load_dotenv

# Load Environment Variables FIRST (before any other imports)
load_dotenv()

from flask import Flask, render_template, request, jsonify
from database.database import initialize_database
from services.ai_service import generate_ai_response
import sqlite3
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader
from docx import Document
import pandas as pd
from PIL import Image
import io
import base64

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# File Upload Configuration
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv", "xlsx", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

# Initialize Database
initialize_database()

DATABASE = "chatbot.db"

# ==============================
# FILE PROCESSING UTILITIES
# ==============================

def allowed_file(filename):
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_pdf_text(file_path):
    """Extract text from PDF file"""
    try:
        text = ""
        with open(file_path, "rb") as file:
            pdf_reader = PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text()
        return text[:5000]  # Limit to 5000 characters
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def extract_docx_text(file_path):
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text[:5000]  # Limit to 5000 characters
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

def extract_txt_text(file_path):
    """Extract text from TXT file"""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            text = file.read()
        return text[:5000]  # Limit to 5000 characters
    except Exception as e:
        return f"Error reading TXT: {str(e)}"

def extract_csv_text(file_path):
    """Extract text from CSV file"""
    try:
        df = pd.read_csv(file_path)
        text = f"CSV Data:\nColumns: {', '.join(df.columns.tolist())}\n"
        text += f"Rows: {len(df)}\n\n"
        text += df.head(10).to_string()
        return text[:5000]  # Limit to 5000 characters
    except Exception as e:
        return f"Error reading CSV: {str(e)}"

def extract_xlsx_text(file_path):
    """Extract text from XLSX file"""
    try:
        df = pd.read_excel(file_path)
        text = f"Excel Data:\nColumns: {', '.join(df.columns.tolist())}\n"
        text += f"Rows: {len(df)}\n\n"
        text += df.head(10).to_string()
        return text[:5000]  # Limit to 5000 characters
    except Exception as e:
        return f"Error reading XLSX: {str(e)}"

def extract_image_text(file_path):
    """Extract basic image information"""
    try:
        image = Image.open(file_path)
        text = f"Image Information:\n"
        text += f"Format: {image.format}\n"
        text += f"Size: {image.size[0]}x{image.size[1]} pixels\n"
        text += f"Mode: {image.mode}\n"
        text += "Note: For detailed image analysis, provide your vision-capable AI model"
        return text
    except Exception as e:
        return f"Error reading image: {str(e)}"

def extract_file_content(file_path, file_extension):
    """Extract content based on file type"""
    file_extension = file_extension.lower()
    
    if file_extension == "pdf":
        return extract_pdf_text(file_path)
    elif file_extension == "docx":
        return extract_docx_text(file_path)
    elif file_extension == "txt":
        return extract_txt_text(file_path)
    elif file_extension == "csv":
        return extract_csv_text(file_path)
    elif file_extension == "xlsx":
        return extract_xlsx_text(file_path)
    elif file_extension in {"jpg", "jpeg", "png"}:
        return extract_image_text(file_path)
    else:
        return "Unsupported file type"

# ==============================
# ROUTES
# ==============================
@app.route("/upload", methods=["POST"])
def upload_file():
    """Handle file upload and content extraction"""
    try:
        # Check if file is present
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files["file"]
        
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400
        
        # Save the file
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Extract content
        file_extension = filename.rsplit(".", 1)[1].lower()
        content = extract_file_content(filepath, file_extension)
        
        # Get file icon based on type
        file_icons = {
            "pdf": "📄",
            "docx": "📝",
            "txt": "📋",
            "csv": "📊",
            "xlsx": "📈",
            "jpg": "🖼",
            "jpeg": "🖼",
            "png": "🖼"
        }
        
        file_icon = file_icons.get(file_extension, "📎")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "content": content,
            "icon": file_icon,
            "type": file_extension
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return render_template("index.html")

# ------------------------------
# Chat API
# ------------------------------
@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    user_message = data.get("message")
    conversation_id = data.get("conversation_id")

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Create new conversation if needed
    if not conversation_id:

        # Use first message as chat title
        title = user_message
        
        # Limit title to first 30 characters
        if len(title) > 30:
            title = title[:30] + "..."

        cursor.execute(
            "INSERT INTO conversations(title) VALUES(?)",
            (title,)
        )

        conversation_id = cursor.lastrowid

    # Save user message
    cursor.execute(
        """
        INSERT INTO messages(conversation_id,sender,message)
        VALUES(?,?,?)
        """,
        (conversation_id, "user", user_message)
    )

    conn.commit()

    # Fetch conversation history
    cursor.execute(
        """
        SELECT sender,message
        FROM messages
        WHERE conversation_id=?
        ORDER BY id
        """,
        (conversation_id,)
    )

    rows = cursor.fetchall()

    messages = []

    for row in rows:

        role = "assistant"

        if row[0] == "user":
            role = "user"

        messages.append({
            "role": role,
            "content": row[1]
        })

    # Generate AI Response
    ai_response = generate_ai_response(messages)

    # Save AI response
    cursor.execute(
        """
        INSERT INTO messages(conversation_id,sender,message)
        VALUES(?,?,?)
        """,
        (conversation_id, "assistant", ai_response)
    )

    conn.commit()

    conn.close()

    return jsonify({
        "reply": ai_response,
        "conversation_id": conversation_id
    })

# ------------------------------
# Load Chat History
# ------------------------------
@app.route("/history")
def history():

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Get pinned conversations first
    cursor.execute("""
        SELECT id, title, pinned
        FROM conversations
        WHERE pinned = 1
        ORDER BY created_at DESC
    """)

    pinned_rows = cursor.fetchall()

    # Get unpinned conversations
    cursor.execute("""
        SELECT id, title, pinned
        FROM conversations
        WHERE pinned = 0
        ORDER BY created_at DESC
    """)

    unpinned_rows = cursor.fetchall()

    conn.close()

    history = []

    # Add pinned conversations first
    for row in pinned_rows:
        history.append({
            "id": row[0],
            "title": row[1],
            "pinned": row[2]
        })

    # Add unpinned conversations
    for row in unpinned_rows:
        history.append({
            "id": row[0],
            "title": row[1],
            "pinned": row[2]
        })

    return jsonify(history)

# ------------------------------
# Load Messages
# ------------------------------
@app.route("/conversation/<int:conversation_id>")
def conversation(conversation_id):

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sender,message
        FROM messages
        WHERE conversation_id=?
        ORDER BY id
    """, (conversation_id,))

    rows = cursor.fetchall()

    conn.close()

    messages = []

    for row in rows:

        messages.append({
            "sender": row[0],
            "message": row[1]
        })

    return jsonify(messages)

# ------------------------------
# Delete Conversation
# ------------------------------
@app.route("/delete/<int:conversation_id>", methods=["DELETE"])
def delete(conversation_id):

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM messages WHERE conversation_id=?",
        (conversation_id,)
    )

    cursor.execute(
        "DELETE FROM conversations WHERE id=?",
        (conversation_id,)
    )

    conn.commit()

    conn.close()

    return jsonify({
        "status": "deleted"
    })

# ------------------------------
# Pin/Unpin Conversation
# ------------------------------
@app.route("/pin/<int:conversation_id>", methods=["POST"])
def pin_conversation(conversation_id):

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Get current pinned status
    cursor.execute(
        "SELECT pinned FROM conversations WHERE id=?",
        (conversation_id,)
    )
    
    result = cursor.fetchone()
    if result:
        current_pinned = result[0]
        new_pinned = 1 if current_pinned == 0 else 0
        
        cursor.execute(
            "UPDATE conversations SET pinned=? WHERE id=?",
            (new_pinned, conversation_id)
        )
        
        conn.commit()

    conn.close()

    return jsonify({
        "status": "success"
    })

# ------------------------------
# Clear All Conversations
# ------------------------------
@app.route("/clear-all", methods=["DELETE"])
def clear_all():

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM messages")
    cursor.execute("DELETE FROM conversations")

    conn.commit()
    conn.close()

    return jsonify({
        "status": "cleared"
    })

# ------------------------------
# Search Conversations
# ------------------------------
@app.route("/search")
def search():

    query = request.args.get("q", "").lower()

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, pinned
        FROM conversations
        WHERE LOWER(title) LIKE ?
        ORDER BY pinned DESC, created_at DESC
    """, (f"%{query}%",))

    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "id": row[0],
            "title": row[1],
            "pinned": row[2]
        })

    return jsonify(results)

# ------------------------------
# Run
# ------------------------------
if __name__ == "__main__":
    app.run(debug=True)