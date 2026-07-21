# Product Idea — Mahalla Ovozi

## The Problem

District leadership in Uzbekistan — the hokim and their staff — are responsible for understanding what problems residents are experiencing across dozens of mahallas. Residents already report their issues informally: they write in local Telegram groups about broken pipes, power outages, gas disruptions, and garbage accumulation. These conversations happen daily, organically, and in real time.

The problem is that no one in district leadership has time to read every group chat, every day, across every mahalla. The signal is there. The visibility is not.

Current tools do not help. There is no way to quickly understand: *What are people complaining about today? Which mahalla? How many people are affected? Has this been going on for a while?*

Leadership ends up either uninformed or overwhelmed.

---

## The Solution

Mahalla Ovozi is a private dashboard for district leadership that automatically listens to approved resident Telegram groups and surfaces meaningful civic situations — without anyone having to read the raw chats.

The core insight: residents describing the same problem in multiple messages are not separate incidents. They are evidence of one situation. The product groups related resident messages together into a single **topic** — a digestible unit that tells leadership: *this is happening, here is what residents are saying, here is how many people are reporting it.*

Topics are presented in a clean, scannable dashboard. Leadership can see at a glance what is being reported across all mahallas, organized by service type: water, electricity, gas, and waste. A separate priority lane highlights situations that residents have explicitly connected to local leadership.

---

## Who It's For

**Primary users:** The district hokim and authorized district staff.

**The hokim's need:** Quickly understand what residents are reporting across all mahallas — without reading chats, without being overwhelmed by noise, and without receiving filtered or summarized second-hand reports from staff.

**Staff's need:** Efficiently monitor specific mahallas or service categories, search for specific issues, and share relevant topics with the hokim when needed.

**Admin users:** A small number of trusted operators who keep the system running smoothly — managing which keywords flag priority situations and monitoring that the system is healthy.

The product is **not** for residents. They never interact with it. Their Telegram behavior stays unchanged.

---

## What It Does

### Listens without interrupting

The system quietly monitors approved resident Telegram groups. Residents keep chatting as they normally do — the product observes only, never replies or engages.

### Groups related reports into topics

When multiple residents report similar situations, the system recognizes the relationship and groups their messages into a single topic. Each topic represents one underlying civic situation, not a pile of individual messages.

### Presents topics in a scannable dashboard

Topics appear in five lanes:
- **Water** — reports about water supply or plumbing issues
- **Electricity** — reports about power outages or electrical problems
- **Gas** — reports about gas supply disruptions
- **Waste** — reports about garbage or sanitation concerns
- **Hokim-related** — situations residents have linked explicitly to district leadership

A single topic about a gas leak that is also linked to the hokim appears in both the Gas lane and the Hokim-related lane — it is the same topic, not duplicated.

### Summarizes in Uzbek, in residents' own terms

Each topic has an AI-generated summary in Uzbek Cyrillic. The summary describes what residents are saying — accurately and honestly. It never claims a situation is confirmed or resolved. It attributes statements to residents, not to the system.

### Lets leadership read the evidence

Clicking on any topic opens the original resident messages that support it, in chronological order. Leadership can see exactly what was said, by whom, and when — and can jump directly to that message in Telegram if they want to.

### Supports filtering and search

Leadership can filter by mahalla, by time period, or search for specific topics or terms. The dashboard updates in the background without losing your place.

### Lets admins keep the system healthy

Admin users can see whether the system is running normally and can manage which keywords flag situations as relevant to the hokim.

---

## How It Looks and Feels

Mahalla Ovozi is designed for a busy district leader who needs information fast, not a data analyst who wants to explore a system. Every design decision follows from that reality.

### A dashboard divided into five clear lanes

The screen is split into five columns, one per category: Water, Electricity, Gas, Waste, and a Hokim-related priority lane. Each lane scrolls independently. The count at the top of each lane shows how many active topics are there right now. A leader can look at the screen and understand the situation in seconds.

### Topics open in a side panel — the rest stays in place

When a leader clicks on a topic card, a panel slides in from the right showing the original resident messages behind it. The five lanes stay exactly where they are. There is no page navigation, no back button, no losing your place.

### Built for desktop, used in an office

The dashboard is designed for a computer screen in a district office — not a phone. It is not a mobile app and is not intended to be one.

### Everything is written in Uzbek Cyrillic

Every label, button, message, and summary in the interface is in Uzbek Cyrillic. The product is for Uzbek-speaking district leadership in Uzbekistan. Displaying interface text in Latin script is not acceptable.

### The interface never implies judgment

The dashboard looks calm and informational — not like a crisis management system. There are no red alerts, no severity ratings, no urgency indicators, and no status labels like "open", "in progress", or "resolved". The product reports what residents say. It does not evaluate how serious that is.

AI summaries and original resident messages look visually different from each other — so a leader always knows which is the system's interpretation and which is the resident's own words.

### When information is delayed, the screen stays useful

If the system is momentarily behind in processing new messages, the dashboard shows a calm notice at the top. Previously loaded topics remain visible and usable. The interface does not go blank or show an error.

---

## What It Doesn't Do

This is as important as what it does.

- **Does not accept resident complaints.** Residents cannot submit reports through this product. They just talk in their groups as always.
- **Does not reply to residents.** The system is silent. It never posts in any group.
- **Does not verify or resolve situations.** A topic on the dashboard does not mean the situation is real, confirmed, or being handled. That judgment belongs to humans.
- **Does not create cases or track resolution.** There is no workflow for assigning work, tracking status, or closing issues.
- **Does not let operators edit topics.** Leadership sees what residents actually said — not a curated or filtered version. Topics cannot be manually corrected or reassigned.
- **Does not expose resident data publicly.** The dashboard is private, internal, and access-controlled.
- **Does not cover every civic issue.** The initial scope covers only four service categories: water, electricity, gas, and waste. Other types of reports are ignored.

---

## What Success Looks Like

### For leadership

- The hokim can sit down, open the dashboard, and understand what is being reported across the entire district in minutes — without reading a single chat.
- A topic card tells them everything they need to decide whether to pay attention: what the issue is, which mahalla, how many residents are reporting it, and how recent it is.
- If they want more, they can open the topic and read the actual resident messages.
- They trust what they see, because the summaries are honest about uncertainty and clearly attributed to residents.

### For the product

- Related reports from the same situation end up in the same topic — not scattered across dozens of separate entries.
- Noise stays out. Casual chatter, jokes, and off-topic messages do not become topics.
- A situation that starts with one clear message and grows through follow-up replies is recognized as one continuous topic, not fragmented.
- When a situation improves, the summary reflects that honestly — without falsely marking it as "resolved."

### For the operator

- The system runs reliably day after day without constant supervision.
- When something needs attention — a group goes offline, a backlog builds up — it is visible in the dashboard before it becomes a problem.

---

## Scope and Boundaries

### What this covers

- 2–3 districts, each with up to 20–30 monitored mahallas
- One official Telegram group per mahalla (the system does not handle multiple groups per mahalla)
- Four civic service categories: water, electricity, gas, waste
- A single system that covers all districts — mahallas are registered and managed centrally
- Two user roles: regular district users (hokim and staff) and admin users

### What this does not cover

- Any interaction with residents — no chatbot, no commands, no replies
- Case management, issue assignment, or resolution tracking
- Expanding to civic categories beyond the four supported ones
- Cross-mahalla or cross-district topic matching
- Public access or self-registration
- Mobile-first experience (designed for desktop)

---

## Client Responsibilities

Mahalla Ovozi is a tool that observes and surfaces what residents say in their own Telegram groups. This creates a set of real-world responsibilities that belong to the client — the district hokimiyat — not to the software developer.

**Whether residents know they are being monitored.** The product passively listens to approved groups. Whether residents are informed that an official system is observing their group conversations is a decision the client must make and own.

**Whether notification is required.** Related to the above: if Uzbek law or local governance norms require that residents be notified of data collection, the client is responsible for understanding and meeting that requirement.

**Where the data is stored and whether that location is legal.** The product stores resident messages. The client is responsible for confirming that the storage location complies with applicable law in Uzbekistan.

**The legal basis for keeping messages for 90 days.** The system retains resident messages for 90 days. Whether that duration is legally permitted, and under what authority, is the client's responsibility to establish.

**Forwarded messages.** Residents sometimes forward messages from outside the group into a monitored conversation. Whether those forwarded messages may be collected and stored raises a separate ownership question. The client owns that policy decision.

**Future legal and regulatory changes.** If Uzbekistan introduces new data protection rules or government data handling regulations that apply to this product, the client is responsible for identifying them and deciding how to respond.

The developer remains fully responsible for building the system securely, minimizing what data is collected, enforcing access controls, and protecting resident content from unauthorized exposure. The client's ownership of the above decisions does not change that.

---

## Core Principles

**Honesty over confidence.** The product never claims a situation is verified, resolved, or officially acknowledged. It reports what residents say, not what it concludes.

**Evidence stays primary.** AI-generated summaries help leadership scan quickly, but the original resident messages are always one click away. The source of truth is always the residents' own words.

**Passive by design.** The product observes. It does not participate in community conversations, does not respond to residents, and does not change how residents communicate.

**Leadership clarity, not administrative burden.** This is a situational awareness tool, not a task management system. It gives leadership better information. What they do with that information is entirely their decision.
