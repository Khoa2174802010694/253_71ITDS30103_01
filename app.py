from flask import Flask, render_template, request, jsonify
from services.ai_service import ask_ai
from services.database import init_db, save_chat, get_history

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("chat.html")


@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    user_message = data["message"]

    ai_response = ask_ai(user_message)
    save_chat(user_message, ai_response)

    return jsonify({
        "response": ai_response
    })

@app.route("/history")
def history():

    data = get_history()

    html = """
    <h2>Conversation History</h2>

    <table border='1' cellpadding='8'>

    <tr>
        <th>User</th>
        <th>Bot</th>
        <th>Time</th>
    </tr>
    """

    for row in data:

        html += f"""
        <tr>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
        </tr>
        """

    html += "</table>"

    return html

if __name__ == "__main__":
    init_db()

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )

