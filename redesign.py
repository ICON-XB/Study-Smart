import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update :root variables to a clean light mode
root_pattern = r':root\s*\{[^}]+\}'
new_root = '''
:root {
  /* Clean Light Mode Colors */
  --bg-dark: #f8fafc;
  --bg-card: #ffffff;
  --bg-card-hover: #ffffff;
  --border-glass: #e2e8f0;
  --border-glass-focus: #94a3b8;
  
  /* Accent Colors (Restrained) */
  --accent-purple: #2563eb; /* actually blue */
  --accent-purple-glow: rgba(37, 99, 235, 0.1);
  --accent-blue: #0ea5e9;
  --accent-blue-glow: rgba(14, 165, 233, 0.1);
  --accent-green: #059669;
  --accent-green-glow: rgba(5, 150, 105, 0.1);
  --accent-warn: #d97706;
  --accent-warn-glow: rgba(217, 119, 6, 0.1);
  --accent-danger: #dc2626;
  
  /* Text states */
  --text-primary: #0f172a;
  --text-muted: #64748b;
  --text-dark: #ffffff; /* used for button text */
  
  /* Layout Metrics */
  --sidebar-width: 240px;
  --header-height: 72px;
  --border-radius: 8px; /* Human, sharp but soft */
  --transition-smooth: all 0.2s ease-in-out;
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
'''
css = re.sub(root_pattern, new_root.strip(), css, count=1)

# 2. Remove glow-bg completely
css = re.sub(r'\.glow-bg\s*\{[^}]+\}', '.glow-bg { display: none; }', css)

# 3. Modify .glass-card to be flat, no blur, subtle shadow
glass_card_pattern = r'\.glass-card\s*\{[^}]+\}'
new_glass_card = '''
.glass-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: var(--transition-smooth);
  position: relative;
  overflow: hidden;
}
'''
css = re.sub(glass_card_pattern, new_glass_card.strip(), css)

# 4. Modify .glass-card:hover
glass_card_hover_pattern = r'\.glass-card:hover\s*\{[^}]+\}'
new_glass_card_hover = '''
.glass-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
'''
css = re.sub(glass_card_hover_pattern, new_glass_card_hover.strip(), css)

# 5. Buttons - flat, subtle, not giant
btn_pattern = r'\.btn\s*\{[^}]+\}'
new_btn = '''
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: var(--font-main);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-smooth);
  border: 1px solid transparent;
  gap: 8px;
  outline: none;
}
'''
css = re.sub(btn_pattern, new_btn.strip(), css)

# Fix input fields to look professional
input_pattern = r'\.form-input\s*\{[^}]+\}'
new_input = '''
.form-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid var(--border-glass);
  color: var(--text-primary);
  font-family: var(--font-main);
  font-size: 0.875rem;
  transition: var(--transition-smooth);
}
.form-input:focus {
  outline: none;
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 3px var(--accent-purple-glow);
}
'''
css = re.sub(input_pattern, new_input.strip(), css)
css = re.sub(r'\.form-input:focus\s*\{[^}]+\}', '', css) # remove old focus

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Redesign applied.")
