import re

with open('agent.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\[AGENT] Generated \ flashcards.\', '[AGENT] Generated  flashcards.')
content = content.replace('\[AGENT] Based on the scan, you should study \ for an extra \ mins. Schedule updated.\', '[AGENT] Based on the scan, you should study  for an extra  mins. Schedule updated.')
# I'll just use regex to clean up any broken template strings from my previous powershell Add-Content
content = re.sub(r'console\.log\(\\\\[AGENT\] Generated \\\$\{[^\}]+\} flashcards\.\\\\);', 'console.log([AGENT] Generated  flashcards.);', content)

# I'll do a safer replace for line 92
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'console.log' in line and '[AGENT] Generated' in line and '\\' in line:
        lines[i] = '            console.log([AGENT] Generated  flashcards.);'
    elif 'this.showUserFeedback' in line and '[AGENT] Based on' in line and '\\' in line:
        lines[i] = '            this.showUserFeedback([AGENT] Based on the scan, you should study  for an extra  mins. Schedule updated.);'

with open('agent.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
