# Quick Start Guide - Blocklist Generator v2.0

## 🚀 For Claude Code: Implementation Order

### TL;DR

Build a natural language blocklist generator that uses Claude API to convert
user queries like "F2P items between 100k-10m" into filter rules. **6-8 hours
total.**

---

## 📁 Step 1: Create Files (5 minutes)

```bash
# Structure
mkdir -p src/guest/pages
mkdir -p src/guest/components/BlocklistGenerator
mkdir -p src/guest/utils

# Pages
touch src/guest/pages/BlocklistGeneratorPage.jsx

# Components
touch src/guest/components/BlocklistGenerator/NaturalLanguageInput.jsx
touch src/guest/components/BlocklistGenerator/PresetButtons.jsx
touch src/guest/components/BlocklistGenerator/BlocklistPreview.jsx
touch src/guest/components/BlocklistGenerator/ProfileDownloader.jsx
touch src/guest/components/BlocklistGenerator/SimpleModeForm.jsx
touch src/guest/components/BlocklistGenerator/index.js

# Utils
touch src/guest/utils/osrsWikiApi.js
touch src/guest/utils/claudeFilterService.js
touch src/guest/utils/filterRuleEvaluator.js
touch src/guest/utils/presetProfiles.js

# Add route in src/guest/GuestApp.jsx
```

---

## 📝 Step 2: Copy Code from Spec

The complete spec has ALL the code you need. Copy directly from these sections:

### From "Core Logic" section:

1. **osrsWikiApi.js** - OSRS Wiki API client (unchanged from v1.2)
2. **claudeFilterService.js** - Claude API integration with prompt
3. **filterRuleEvaluator.js** - Apply rules to items
4. **presetProfiles.js** - 6 preset queries

### From "Technical Implementation" section:

5. **ProfileDownloader.jsx** - Download handler

---

## 🎯 Step 3: Build Components (2-3 hours)

### NaturalLanguageInput.jsx

```jsx
// Simple textarea + button
- Textarea (500 char max)
- "Generate Blocklist" button
- Loading state
- Example queries shown
```

### PresetButtons.jsx

```jsx
// Grid of 6 buttons
- Import from presetProfiles.js
- onClick fills query textarea
- Responsive grid
```

### BlocklistPreview.jsx

```jsx
// Results display
- Show Claude's interpretation
- Show counts (tradeable/blocked)
- Top 10 sample items
- Profile name input
- Download button
```

### SimpleModeForm.jsx

```jsx
// Fallback when API unavailable
- Min/Max price inputs
- F2P checkbox
- Generate button
```

### ProfileDownloader.jsx

```jsx
// Use code from spec
- downloadProfile() function
- Appends "Mreedon" to filename
```

---

## 🔧 Step 4: Main Page Assembly (1 hour)

### BlocklistGeneratorPage.jsx

**State:**

```javascript
const [query, setQuery] = useState('');
const [filterConfig, setFilterConfig] = useState(null);
const [preview, setPreview] = useState(null);
const [profileName, setProfileName] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Fetch OSRS data on mount
useEffect(() => {
  fetchItemMapping().then(setItemsData);
  fetchLatestPrices().then(setPriceData);
  fetch5MinVolume().then(setVolumeData);
}, []);
```

**Flow:**

1. User types query or clicks preset
2. User clicks "Generate"
3. Call `convertQueryToFilterRules(query, ...)`
4. Show interpretation
5. Call `evaluateFilterRules(filterConfig, ...)`
6. Show preview
7. User downloads

---

## ⚡ Step 5: Critical Implementation Details

### Claude API Call

````javascript
// Use this exact model
model: 'claude-sonnet-4-20250514';

// Strip markdown from response
const cleanedText = jsonText
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();
````

### OSRS Wiki API

```javascript
// REQUIRED User-Agent
headers: {
  'User-Agent': 'OSRS Flip Dashboard Blocklist Generator - github.com/1000tomax/OSRS-Flip-Tracker-Combined'
}

// Item IDs are STRINGS
priceData[String(item.id)]  // ✅ Correct
priceData[item.id]          // ❌ Wrong
```

### Filter Evaluation

```javascript
// Multiple rules = OR logic
// Conditions within rule = AND logic
for (const rule of rules) {
  if (allConditionsMet) {
    return rule.type === 'include';
  }
}
return defaultAction === 'include';
```

---

## 🎨 UI Guidelines

**Tailwind Classes:**

- Background: `bg-gray-900`, `bg-gray-800`
- Text: `text-gray-300`, `text-gray-200`
- Primary button: `bg-blue-600 hover:bg-blue-700`
- Border: `border-gray-700`

**Loading States:**

- During Claude API: "🧠 Understanding your request..."
- During filtering: "⚙️ Applying filters..."

**Error Messages:**

- Claude timeout: "Query too complex. Try simpler terms or use Simple Mode."
- Invalid JSON: "Couldn't understand query. Try rephrasing."
- API failure: "Claude API unavailable. Using Simple Mode."

---

## 🧪 Testing Checklist

### Test These Queries:

- ✅ "F2P items between 100k and 10m"
- ✅ "Everything under 10m except high volume items"
- ✅ "Members items over 1m OR items with 50k+ volume"
- ✅ "Block cheap items unless they're popular"

### Test Edge Cases:

- ✅ No items match (show warning)
- ✅ All items match (show info)
- ✅ Claude API timeout
- ✅ Invalid query
- ✅ Missing API key → Simple Mode

### Test UI:

- ✅ Mobile responsive (320px width)
- ✅ Preset buttons work
- ✅ Profile name editable
- ✅ Download has "Mreedon" suffix
- ✅ File imports to Flipping Copilot

---

## 🐛 Common Issues

**Issue:** Claude returns invalid JSON  
**Fix:** Strip markdown code blocks in parsing

**Issue:** Prices return undefined  
**Fix:** Use `String(item.id)` for lookups

**Issue:** Claude API timeout  
**Fix:** Set 30s timeout, suggest simpler query

**Issue:** No items match  
**Fix:** Show warning: "Criteria too strict. Try broader terms."

---

## 📊 Expected Results

After 6-8 hours, you should have:

✅ Natural language query input  
✅ 6 working presets  
✅ Claude interprets queries correctly  
✅ Shows interpretation to user  
✅ Filters work with OR/EXCEPT logic  
✅ Preview shows counts and samples  
✅ Download works with "Mreedon" branding  
✅ Simple Mode fallback  
✅ Mobile responsive  
✅ Error handling

---

## 🎯 Priority Order

**Must implement first:**

1. OSRS Wiki API (osrsWikiApi.js)
2. Claude API (claudeFilterService.js)
3. Filter evaluator (filterRuleEvaluator.js)
4. Main page with query input
5. Preview component
6. Download function

**Can implement later:** 7. Preset buttons 8. Simple Mode fallback 9. Error
refinements 10. Polish

---

## 💡 Key Insight

**The Claude API does 90% of the work!**

Instead of building complex UI for every filter combination, you just:

1. Pass user's text to Claude
2. Get back structured filter rules
3. Apply rules to items
4. Done!

This is why it's faster than the slider approach (6-8 hours vs 8-12 hours).

---

## 📞 Need Help?

**Reference the full spec** (`blocklist-generator-spec-v2.md`) for:

- Complete code examples
- Full Claude prompt
- Detailed error handling
- All edge cases
- Filter rule structure

**Everything you need is in the spec!**

---

**Start with Step 1 and work through sequentially. Good luck! 🚀**

_Version: 2.0_  
_Estimated Time: 6-8 hours_  
_Difficulty: Medium_
