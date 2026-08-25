import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove emojis
html = html.replace('??', '')
html = html.replace('??', '')
html = html.replace('??', '')
html = html.replace('??', '')
html = html.replace('??', '')
html = html.replace('?', '')
html = html.replace('??', '')
html = html.replace('??', '')

# Remove AI generic text
html = html.replace('Unlock your full potential and support development.', 'Upgrade to Premium for unlimited access.')
html = html.replace('AI Exam Architect', 'Study Organizer')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML cleaned.")
