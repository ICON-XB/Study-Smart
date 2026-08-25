import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix buttons
btn_primary = r'\.btn-primary\s*\{[^}]+\}'
new_btn_primary = '''
.btn-primary {
  background: var(--text-primary);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.btn-primary:hover {
  background: #334155;
  transform: none;
}
'''
css = re.sub(btn_primary, new_btn_primary.strip(), css)

btn_secondary = r'\.btn-secondary\s*\{[^}]+\}'
new_btn_secondary = '''
.btn-secondary {
  background: #ffffff;
  color: var(--text-primary);
  border: 1px solid var(--border-glass);
}
.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: none;
}
'''
css = re.sub(btn_secondary, new_btn_secondary.strip(), css)

# Typography fixes - make headings smaller and tighter
h1 = r'h1\s*,\s*\.h1\s*\{[^}]+\}'
new_h1 = '''
h1, .h1 {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--text-primary);
}
'''
css = re.sub(h1, new_h1.strip(), css)

h2 = r'h2\s*,\s*\.h2\s*\{[^}]+\}'
new_h2 = '''
h2, .h2 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--text-primary);
}
'''
css = re.sub(h2, new_h2.strip(), css)

h3 = r'h3\s*,\s*\.h3\s*\{[^}]+\}'
new_h3 = '''
h3, .h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}
'''
css = re.sub(h3, new_h3.strip(), css)

# Remove purple glows on stat cards by redefining those classes as empty or just subtle border colors
css = re.sub(r'\.glow-card-purple[^{]*\{[^}]+\}', '.glow-card-purple { border-top: 3px solid var(--accent-purple); }', css)
css = re.sub(r'\.glow-card-blue[^{]*\{[^}]+\}', '.glow-card-blue { border-top: 3px solid var(--accent-blue); }', css)
css = re.sub(r'\.glow-card-green[^{]*\{[^}]+\}', '.glow-card-green { border-top: 3px solid var(--accent-green); }', css)
css = re.sub(r'\.purple-bg[^{]*\{[^}]+\}', '.purple-bg { background-color: var(--accent-purple); }', css)
css = re.sub(r'\.blue-bg[^{]*\{[^}]+\}', '.blue-bg { background-color: var(--accent-blue); }', css)
css = re.sub(r'\.green-bg[^{]*\{[^}]+\}', '.green-bg { background-color: var(--accent-green); }', css)

# Fix Top Header
header_pattern = r'\.top-header\s*\{[^}]+\}'
new_header = '''
.top-header {
  height: var(--header-height);
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-glass);
  background: var(--bg-card);
  position: sticky;
  top: 0;
  z-index: 50;
}
'''
css = re.sub(header_pattern, new_header.strip(), css)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Redesign 3 applied.")
