# OSRS Flip Tracker – 1K to Max Challenge 💰

This is the frontend for my personal Old School RuneScape flipping challenge, starting from **1,000 GP** with the goal of reaching **max cash (2.147B GP)** using only Grand Exchange trades.

Flipping data is manually exported from [Flipping Copilot](https://www.flippingcopilot.com/) and automatically summarized into daily performance logs, ROI tracking, item profitability, and net worth growth.

---

## 📊 Live Site
> https://mreedon.com

---

## 🧠 How It Works

This is a **static React dashboard**, built with:

- **React + Vite**
- **TailwindCSS** for styling
- **Recharts** (in progress) for graphs
- **PapaParse** for CSV processing
- **Hosted via Vercel** (auto-deployed on Git push)

All data is pre-generated locally using a custom Node.js backend, then committed as static `.json` / `.csv` files in `/public/data`.

---

## 🗂 Project Structure

| Folder / File            | Purpose                                |
|--------------------------|----------------------------------------|
| `public/data/`           | Auto-generated flip summaries          |
| `src/components/`        | React view components (daily logs, etc)|
| `src/hooks/`             | Data loading hooks                     |
| `index.html`             | Entry HTML, includes favicon + title   |
| `tailwind.config.js`     | Tailwind styling setup                 |
| `package.json`           | Dependencies and Vite config           |

---

## 📦 Data Sources

Flip data is exported daily from the **Flipping Copilot** RuneLite plugin and includes:

- All Grand Exchange flips (buy/sell pairs)
- Item name, quantities, price, ROI, and profit
- Daily summaries with:
    - Net worth
    - Daily profit
    - ROI %
    - Progress toward 2.147B
    - ETA to max cash based on average profit

---

## 🤝 Credits

- All flip data exported via **Flipping Copilot**
- Hosted using **Vercel**
- Built and maintained by [@1000tomax](https://github.com/1000tomax)

---

> “Progress updates automatically every time I run my local tracker. All stats are real, manual flips — no automation or merch bots used.”

