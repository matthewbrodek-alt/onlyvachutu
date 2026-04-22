from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')

# Создаем клиента по новому стандарту
client = genai.Client(api_key=api_key)

try:
    # Метод теперь вызывается через client.models
    response = client.models.generate_content(
        model="gemini-1.5-flash", 
        contents="Привет, ты работаешь в новом SDK?"
    )
    print("ОТВЕТ ИИ:", response.text)
except Exception as e:
    print("ОШИБКА ТУТ:", e)