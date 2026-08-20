# EventHub — LinkedIn Business & Enterprise Handover Guide

This guide explains how **EventHub** handles LinkedIn event promotion, attendee engagement, and automated social publishing for business clients and marketing teams.

---

## 📌 Executive Summary

EventHub provides a **3-Tier LinkedIn Architecture** designed so that:
1. **Marketing & Event Teams** can promote events immediately on their official LinkedIn Company Page with zero IT setup or API keys.
2. **Attendees** with LinkedIn profiles can be directly pinged with personalized digital entry passes in 1 click.
3. **IT & Enterprise Teams** can plug in automated OAuth 2.0 or Webhook publishing (Zapier / Make / Buffer) whenever desired.

---

## 🏢 Tier 1: Zero-Config Delegated Company Page Publishing (Day 1 Ready)

### How It Works:
No API keys, developer apps, or server configurations are needed.

1. The business organiser opens any event in EventHub and clicks **"Promote on LinkedIn 🚀"**.
2. EventHub automatically:
   - Formats a high-engagement post body with custom agenda highlights and emojis.
   - Generates a downloadable **1200×627 High-Res Social Banner**.
   - Provides the downloadable **Official Event Program PDF**.
   - Copies the complete multi-line post text to the user's clipboard.
3. Clicking **"Share on LinkedIn"** opens LinkedIn's native feed composer.
4. In LinkedIn's composer:
   - At the top of the composer window, the user clicks the profile dropdown and selects **"Post as: [Official Company Page]"** (if they are a page admin).
   - Press **`Ctrl + V`** to paste the complete text and agenda.
   - Click the **Document (📄)** icon to attach the Program PDF (renders as a swipeable carousel), or the **Photo (🖼️)** icon to attach the 1200×627 banner.
   - Click **Post**.

---

## 👥 Tier 2: 1-Click Attendee Roster Direct Ping

### How It Works:
When attendees register with their LinkedIn profile URL:

1. Navigate to `/events/:id/attendees`.
2. In the attendee table, attendees with a linked profile show a blue **"Ping"** button.
3. Clicking **"Ping"**:
   - Auto-copies a personalized VIP invitation with their name, event date, venue, and unique digital pass link (`/tickets/{partId}`).
   - Opens their LinkedIn profile in a new tab.
   - The organiser clicks **"Message"** $\rightarrow$ **`Ctrl + V`** $\rightarrow$ **Send**.

---

## 🤖 Tier 3: Model Context Protocol (MCP) & Automated Webhook Dispatch

### 1. MCP Tool Invocation (`mcp_linkedin_task.json`)
EventHub generates standard JSON-RPC 2.0 MCP tool payloads (`linkedin_publish_campaign`). Any local MCP runner, browser automation agent (Playwright/Puppeteer), or AI assistant can execute the task without needing official LinkedIn developer API tiers.

### 2. Webhook / Zapier / Buffer Automation
EventHub can dispatch a webhook payload directly to the business's social media automation pipeline (e.g. Zapier, Make.com, Buffer):
- **Payload Schema**:
  ```json
  {
    "event": "event.published",
    "eventTitle": "AI & Cloud Summit 2026",
    "company": "Enterprise Host",
    "date": "Thursday, Sep 24, 2026",
    "location": "Tunis Convention Center",
    "content": "🚀 ANNOUNCING: ...",
    "hashtags": "#EventHub #Innovation",
    "url": "https://eventhub.com/events/1",
    "banner": { "width": 1200, "height": 627 }
  }
  ```

---

## 🔑 Tier 4: Official LinkedIn Enterprise OAuth 2.0 API (Optional)

If the enterprise client's IT team wants EventHub's backend server to post directly via REST API:

### Steps for the Client's IT Department:
1. Go to [developer.linkedin.com](https://developer.linkedin.com) and create an App under their official Company Page.
2. Under **Products**, add:
   - **Share on LinkedIn**
   - **Sign In with LinkedIn using OpenID Connect**
3. In **Auth**, note the `Client ID` and `Client Secret`.
4. Add to the backend `appsettings.json`:
   ```json
   "LinkedIn": {
     "ClientId": "YOUR_CLIENT_ID",
     "ClientSecret": "YOUR_CLIENT_SECRET",
     "RedirectUri": "https://yourdomain.com/api/auth/linkedin/callback",
     "OrganizationUrn": "urn:li:organization:12345678"
   }
   ```
5. The backend endpoint `POST https://api.linkedin.com/rest/posts` will publish posts directly to the organization's feed.

---

## 📊 Database Schema Reference

| Table | Column | Type | Purpose |
| :--- | :--- | :--- | :--- |
| `[dbo].[People]` | `[LinkedInUrl]` | `NVARCHAR(500)` | Stores individual attendee & personnel LinkedIn profile URLs. |
| `[dbo].[Companies]` | `[LinkedInUrl]` | `NVARCHAR(500)` | Stores official LinkedIn Company Page URLs. |
