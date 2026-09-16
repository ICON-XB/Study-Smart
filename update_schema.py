import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

load_state_new = """async function loadState() {
  try {
    appState.schemaVersion = await SecureStore.load('StudySmart_SchemaVersion') || 1;
    appState.modules = await SecureStore.load(STORE_KEYS.MODULES) || [];
    appState.flashcards = await SecureStore.load(STORE_KEYS.FLASHCARDS) || [];
    appState.sessions = await SecureStore.load(STORE_KEYS.SESSIONS) || [];
    appState.streak = await SecureStore.load(STORE_KEYS.STREAK) || { count: 0, lastStudyDate: '' };
    appState.settings = await SecureStore.load(STORE_KEYS.SETTINGS) || {
      weekdayHours: 3,
      weekendHours: 5,
      startDate: new Date().toISOString().split('T')[0],
      prioritizeBy: 'exam-proximity'
    };
    appState.schedule = await SecureStore.load(STORE_KEYS.SCHEDULE) || [];
    
    // Schema Migrations
    if (appState.schemaVersion < 2) {
      console.log('Migrating schema to v2: Universities & Profiles');
      appState.universities = await SecureStore.load('StudySmart_Universities') || [];
      appState.schemaVersion = 2;
    } else {
      appState.universities = await SecureStore.load('StudySmart_Universities') || [];
    }

    if (appState.schemaVersion < 3) {
      console.log('Migrating schema to v3: Documents, Assessments & Sources');
      appState.documents = await SecureStore.load('StudySmart_Documents') || [];
      appState.assessments = await SecureStore.load('StudySmart_Assessments') || [];
      appState.schemaVersion = 3;
      await saveState(); // Idempotent save
    } else {
      appState.documents = await SecureStore.load('StudySmart_Documents') || [];
      appState.assessments = await SecureStore.load('StudySmart_Assessments') || [];
    }
    
    // Seed mock data if completely empty
    if (appState.modules.length === 0) {
      appState.modules = MOCK_MODULES;
      appState.flashcards = MOCK_FLASHCARDS;
      await saveState();
    }
  } catch (e) {
"""

save_state_new = """async function saveState() {
  try {
    await SecureStore.save('StudySmart_SchemaVersion', appState.schemaVersion || 3);
    await SecureStore.save(STORE_KEYS.MODULES, appState.modules);
    await SecureStore.save(STORE_KEYS.FLASHCARDS, appState.flashcards);
    await SecureStore.save(STORE_KEYS.SESSIONS, appState.sessions);
    await SecureStore.save(STORE_KEYS.STREAK, appState.streak);
    await SecureStore.save(STORE_KEYS.SETTINGS, appState.settings);
    await SecureStore.save(STORE_KEYS.SCHEDULE, appState.schedule);
    await SecureStore.save('StudySmart_Universities', appState.universities || []);
    await SecureStore.save('StudySmart_Documents', appState.documents || []);
    await SecureStore.save('StudySmart_Assessments', appState.assessments || []);
  } catch (e) {
"""

content = re.sub(r'async function loadState\(\) \{\s*try \{\s*appState\.modules.*?\} catch \(e\) \{', load_state_new, content, flags=re.DOTALL)
content = re.sub(r'async function saveState\(\) \{\s*try \{\s*await SecureStore\.save\(STORE_KEYS\.MODULES.*?} catch \(e\) \{', save_state_new, content, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema updated.")
