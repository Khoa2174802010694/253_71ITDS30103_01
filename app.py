import os

from flask import Flask, jsonify, render_template, request

from services.ai_service import ask_ai
from services.database import (
    init_db,
    save_chat,
    get_history,
    clear_history
)

app = Flask(__name__)


# ==========================
# Home
# ==========================

@app.route("/")
def home():
    return render_template("chat.html")


# ==========================
# Chat API
# ==========================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is missing."
            }), 400

        user_message = data.get("message", "").strip()

        if user_message == "":
            return jsonify({
                "success": False,
                "message": "Message cannot be empty."
            }), 400

        ai_response = ask_ai(user_message)

        save_chat(
            user_message=user_message,
            bot_message=ai_response
        )

        return jsonify({

            "success": True,

            "response": ai_response

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# ==========================
# History API
# ==========================

@app.route("/history", methods=["GET"])
def history():

    try:

        history_data = get_history()

        return jsonify({

            "success": True,

            "history": history_data

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# ==========================
# Clear History
# ==========================

@app.route("/history", methods=["DELETE"])
def delete_history():

    try:

        clear_history()

        return jsonify({

            "success": True,

            "message": "Conversation history cleared."

        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# ==========================
# Health Check
# ==========================

@app.route("/health")
def health():

    return jsonify({

        "status": "online",

        "application": "VanLangpt"

    })


# ==========================
# Run
# ==========================

if __name__ == "__main__":

    init_db()

    app.run(

        host="0.0.0.0",

        port=int(os.environ.get("PORT", 5000)),

        debug=False

    )