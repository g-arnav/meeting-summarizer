from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()  # Load API key from .env file

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def summarize_meeting(meeting_text, provider="anthropic"):
    """
    Takes raw meeting notes, returns structured summary
    """
    prompt = f"""Analyze these meeting notes. First check if they are valid notes and not garbage input.
        If they are, simply return "Invalid Input".
        If they are valid notes, provide:

        1. **Summary** (2-3 sentences of main points and 1 sentence on overall sentiment)
        2. **Key Decisions** (bullet list)
        3. **Action Items** (bullet list with owners if mentioned)
        4. **Important Dates/Deadlines** (if any)

        Meeting notes:
        {meeting_text}

        Format your response clearly with the headers above."""

    if provider == "anthropic":
        message = anthropic_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    elif provider == "openai":
        message = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.choices[0].message.content

    else:
        raise ValueError(f"Unknown provider: {provider}")

@app.route('/summarize', methods=['POST'])
def summarize():
    """
    POST /summarize
    Body: { "text": "meeting notes here" 
            "provider": "anthropic or openai" (optional, defaults to anthropic) }
    Returns: { "summary": "formatted summary" }
    """
    try:
        print("Received summarize request")  # Log incoming requests

        # Get the meeting text from request
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        meeting_text = data['text'].strip()
        provider = data.get('provider', 'anthropic').strip().lower()  # Optional provider selection
        
        if provider not in ['anthropic', 'openai']:
            return jsonify({"error": "Invalid provider. Choose 'anthropic' or 'openai'."}), 400
        
        # Validate input
        if len(meeting_text) < 50:
            return jsonify({"error": "Text too short. Provide at least 50 characters."}), 400
        
        # Call Claude
        summary = summarize_meeting(meeting_text, provider)
        
        if summary.strip().lower() == "invalid input":
            return jsonify({"error": "Invalid input. Please provide real meeting notes."}), 400

        return jsonify({"summary": summary}), 200
        
    except anthropic.APIStatusError as e:
        return jsonify({"error": f"AI API error: {e.message}"}), 502
    except anthropic.APIConnectionError:
        return jsonify({"error": "Could not connect to AI service"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    print("Health check requested")  # Log health check requests
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)