# Blocklist Generator v2.0 - Claude API Approach

## 🎉 Major Redesign Summary

We've completely redesigned the blocklist generator to use **Claude API natural
language filtering** as the primary interface, replacing the original
slider-based UI.

---

## 🤔 Why This Change?

### Original Plan (v1.2)

- Dual-range price sliders
- F2P/Members radio buttons
- Volume toggle + slider
- Complex state management
- **Development time:** 8-12 hours
- **Complexity:** AND-only logic

### New Plan (v2.0)

- Natural language text input
- Claude API converts query to filters
- Preset buttons for common use cases
- **Development time:** 6-8 hours ✅
- **Complexity:** Handles OR, EXCEPT, AND automatically ✅

---

## 💡 Key Advantages

### 1. **Already Have Infrastructure**

- Project already uses Claude API (text-to-SQL generator)
- Can reuse existing integration patterns
- No new dependencies needed

### 2. **Faster Development**

- 6-8 hours vs 8-12 hours
- No complex slider components to build
- Simpler state management
- Less UI code overall

### 3. **Better UX**

- Users describe what they want in plain English
- Consistent with existing AI query feature
- More intuitive than learning sliders
- Shows interpretation for confirmation

### 4. **Infinite Flexibility**

- Handles OR logic: "items A OR items B"
- Handles EXCEPT logic: "everything EXCEPT items with X"
- Handles complex multi-conditions
- No UI needed for edge cases

### 5. **Negligible Cost**

- $0.004 per query (~half a cent)
- 100 queries = $0.40
- Already paying for API anyway

### 6. **Unique Feature**

- No other OSRS tool has natural language filtering
- Differentiates your product
- "AI-powered" is a selling point

---

## 📱 New User Experience

### Old Flow (Sliders)

```
1. User adjusts price slider (100k - 10m)
2. User toggles F2P checkbox
3. User clicks "Preview"
4. See results
5. Download
```

### New Flow (Natural Language)

```
1. User types: "F2P items between 100k and 10m"
   OR clicks preset button
2. User clicks "Generate Blocklist"
3. Claude interprets query ✨
4. Shows interpretation: "Include only F2P items priced between 100,000 and 10,000,000 gp"
5. See results
6. Download
```

### Example Queries Users Can Type

- "F2P items between 100k and 10m"
- "Everything under 10m except high volume items"
- "Members items over 1m that trade frequently"
- "Block cheap items unless they're popular"
- "Combat gear under 5m OR any item with 50k+ volume"

---

## 🏗️ Technical Architecture

### File Structure

```
src/guest/
  ├── pages/
  │   └── BlocklistGeneratorPage.jsx       # Main page
  ├── components/BlocklistGenerator/
  │   ├── NaturalLanguageInput.jsx         # Query textarea
  │   ├── PresetButtons.jsx                # Quick presets
  │   ├── BlocklistPreview.jsx             # Results
  │   ├── ProfileDownloader.jsx            # Download
  │   └── SimpleModeForm.jsx               # Fallback
  └── utils/
      ├── osrsWikiApi.js                   # OSRS API
      ├── claudeFilterService.js           # Claude API
      ├── filterRuleEvaluator.js           # Apply rules
      └── presetProfiles.js                # Preset queries
```

### Data Flow

```
User Query
    ↓
Claude API (convert to filter rules)
    ↓
Filter Rules (JSON structure)
    ↓
Filter Evaluator (apply to items)
    ↓
Tradeable/Blocked Lists
    ↓
Profile Download
```

### Filter Rules Structure

```json
{
  "interpretation": "Include F2P items between 100k-10m",
  "rules": [
    {
      "type": "include",
      "conditions": [
        {
          "field": "price",
          "operator": "between",
          "value": [100000, 10000000]
        },
        { "field": "f2p", "operator": "eq", "value": true }
      ],
      "combineWith": "AND"
    }
  ],
  "defaultAction": "exclude"
}
```

---

## 🎛️ Preset Profiles

6 common use cases as one-click buttons:

1. **F2P under 1m** - "F2P items under 1 million gp"
2. **Budget flips** - "Items between 100k and 5m with good volume"
3. **High volume items** - "Any item with trading volume over 10000"
4. **Members 1m-10m** - "Members-only items between 1m and 10m"
5. **Popular items** - "Items with volume over 5000 between 100k and 20m"
6. **Low risk flips** - "F2P items between 50k and 500k with high volume"

---

## 🛡️ Fallback Strategy

**What if Claude API fails or user doesn't have key?**

### Simple Mode Fallback

```
┌─────────────────────────────────────┐
│ ⚠️ Claude API unavailable            │
│                                     │
│ Create a simple profile manually:   │
│                                     │
│ Min Price (gp): [100000]           │
│ Max Price (gp): [10000000]         │
│                                     │
│ [✓] F2P Only                       │
│ [ ] Members Only                   │
│                                     │
│ [Generate Profile]                 │
└─────────────────────────────────────┘
```

---

## 💰 Cost Analysis

### Per Query

- Input tokens: ~500 (~prompt + context)
- Output tokens: ~200 (JSON response)
- **Cost:** $0.004 (less than half a cent!)

### Monthly Estimates

| Usage              | Cost  |
| ------------------ | ----- |
| 10 queries/month   | $0.04 |
| 100 queries/month  | $0.40 |
| 1000 queries/month | $4.00 |

**Verdict:** Effectively free for this use case

---

## ⏱️ Development Timeline

### Phase 1: Setup (30 min)

- Create file structure
- Add route to app

### Phase 2: OSRS Wiki API (1 hour)

- Reuse existing code from v1.2
- No changes needed

### Phase 3: Claude API Integration (2 hours)

- Prompt engineering
- JSON parsing
- Error handling

### Phase 4: Filter Evaluator (1 hour)

- Rule evaluation logic
- Condition checking
- Name generation

### Phase 5: Preset Profiles (30 min)

- Define 6 presets
- Helper functions

### Phase 6: UI Components (2-3 hours)

- NaturalLanguageInput
- PresetButtons
- BlocklistPreview
- SimpleModeForm
- ProfileDownloader

### Phase 7: Main Page (1 hour)

- State management
- Wire up components
- Flow logic

### Phase 8: Error Handling (45 min)

- Claude API errors
- OSRS API errors
- Edge cases

### Phase 9: Polish & Testing (1 hour)

- Loading states
- Success messages
- Mobile testing
- Complex query testing

**Total: 6-8 hours**

---

## 📋 What's Included vs v1.2

| Feature            | v1.2 (Sliders)     | v2.0 (Claude)       |
| ------------------ | ------------------ | ------------------- |
| Price filtering    | ✅ Sliders         | ✅ Natural language |
| F2P filtering      | ✅ Toggle          | ✅ Natural language |
| Volume filtering   | ✅ Toggle + slider | ✅ Natural language |
| OR logic           | ❌ Not supported   | ✅ Native support   |
| EXCEPT logic       | ❌ Not supported   | ✅ Native support   |
| Complex conditions | ❌ Limited         | ✅ Unlimited        |
| Preset profiles    | ❌ Not planned     | ✅ 6 presets        |
| Development time   | 8-12 hours         | 6-8 hours           |
| Maintenance        | High (UI updates)  | Low (prompt tweaks) |

---

## 🎯 Success Criteria

### Must Work

- ✅ Natural language query input
- ✅ Claude API conversion
- ✅ Filter rule evaluation
- ✅ Preset profiles
- ✅ Preview results
- ✅ Download with Mreedon branding
- ✅ Simple Mode fallback
- ✅ OR/EXCEPT logic
- ✅ Mobile responsive

### Nice to Have (Phase 2)

- Query history
- Expandable item lists
- Save custom presets
- Optimization suggestions

---

## 🚨 Critical Implementation Notes

1. **Reuse existing Claude API code** from text-to-SQL generator
2. **User-Agent required** for OSRS Wiki API
3. **Item IDs are strings** when looking up prices: `priceData[String(item.id)]`
4. **Handle null prices** gracefully
5. **Show interpretation** to user for confirmation
6. **30-second timeout** for Claude API
7. **Strip markdown** from Claude JSON responses
8. **Fallback to Simple Mode** when API unavailable

---

## 📊 Comparison: Implementation Complexity

### v1.2 Components

```javascript
// Needed for slider approach
<DualRangeSlider min={1000} max={2147483647} />
<VolumeToggle onChange={...} />
<ConditionalVolumeSlider show={volumeEnabled} />
<F2PToggle ... />
<MembersToggle ... />
// Complex state management for all sliders
// Complex logic for volume toggle + conditional API call
```

### v2.0 Components

```javascript
// Much simpler with Claude
<textarea value={query} onChange={...} />
<PresetButtons onSelect={...} />
<button>Generate Blocklist</button>
// Claude handles all the complexity
```

---

## 🔮 Future Enhancements

### Phase 2

- Query history
- Optimization suggestions
- Share profile links

### Phase 3

- Category inference (Claude identifies item types)
- Multi-turn conversation
- Multi-language support
- Community presets

---

## ✅ Ready to Implement

The spec is now complete with:

- ✅ Complete code examples
- ✅ Comprehensive prompt engineering
- ✅ Step-by-step implementation guide
- ✅ Error handling strategies
- ✅ Testing procedures
- ✅ Preset profiles defined
- ✅ Fallback mode planned

**Hand off to Claude Code and start building!** 🚀

---

_Version: 2.0_  
_Status: Ready for Implementation_  
_Estimated Time: 6-8 hours_  
_Complexity: Lower than v1.2_  
_Cost: ~$0.004 per query_
