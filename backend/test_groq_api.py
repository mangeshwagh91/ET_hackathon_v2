from groq import Groq

client = Groq(api_key="YOUR_NEW_KEY")

response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)