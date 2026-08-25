import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Sidebar redesign - flat white, subtle border
sidebar_pattern = r'\.sidebar\s*\{[^}]+\}'
new_sidebar = '''
.sidebar {
  width: var(--sidebar-width);
  background-color: var(--bg-card);
  border-right: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  transition: var(--transition-smooth);
}
'''
css = re.sub(sidebar_pattern, new_sidebar.strip(), css)

# Nav items - flat, clean
nav_item_pattern = r'\.nav-item\s*\{[^}]+\}'
new_nav_item = '''
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  transition: var(--transition-smooth);
  margin-bottom: 4px;
}
'''
css = re.sub(nav_item_pattern, new_nav_item.strip(), css)

# Nav item active
nav_item_active_pattern = r'\.nav-item\.active\s*\{[^}]+\}'
new_nav_item_active = '''
.nav-item.active {
  background: #f1f5f9;
  color: var(--accent-purple);
}
'''
css = re.sub(nav_item_active_pattern, new_nav_item_active.strip(), css)

# Modal Overlay - subtle blur, flat modal
modal_overlay_pattern = r'\.modal-overlay\s*\{[^}]+\}'
new_modal_overlay = '''
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
'''
css = re.sub(modal_overlay_pattern, new_modal_overlay.strip(), css)

modal_card_pattern = r'\.modal-card\s*\{[^}]+\}'
new_modal_card = '''
.modal-card {
  background: var(--bg-card);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 500px;
  padding: 32px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transform: translateY(10px) scale(0.98);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-glass);
}
'''
css = re.sub(modal_card_pattern, new_modal_card.strip(), css)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Redesign 2 applied.")
