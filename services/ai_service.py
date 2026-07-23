import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

SYSTEM_PROMPT = """
You are VanLangpt, an AI Study Assistant.

Your responsibilities:

- Help students answer academic questions.
- Explain concepts clearly and accurately.
- Help with programming, AI, databases, cloud computing, software engineering and related technologies.
- Format answers using Markdown whenever appropriate.
- When writing code, always use Markdown code blocks.
- Be concise first, then provide more detail if necessary.
- If you don't know the answer, say so instead of making up information.
- Never claim to perform actions you cannot actually perform.
- Respond in the same language as the user's message whenever possible.
"""


def ask_ai(message: str) -> str:
    """
    Send a user message to OpenAI and return the response.
    """

    try:

        response = client.chat.completions.create(

            model="gpt-4o-mini",

            temperature=0.7,

            max_tokens=1000,

            messages=[

                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },

                {
                    "role": "user",
                    "content": message
                }

            ]

        )

        return response.choices[0].message.content.strip()

    except Exception as e:

        return f"OpenAI Error: {str(e)}"