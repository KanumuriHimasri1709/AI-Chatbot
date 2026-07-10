import os
from groq import Groq

# Create Groq Client
client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

def generate_ai_response(messages):
    """
    Sends the conversation history to Groq AI
    and returns the assistant's reply.
    """

    try:

        completion = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=messages,

            temperature=0.7,

            max_tokens=1024

        )

        return completion.choices[0].message.content

    except Exception as e:

        return f"Error : {str(e)}"
