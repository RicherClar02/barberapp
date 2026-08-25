# Cookie Policy — Estilo web panel

**Version:** 1.0
**Last updated:** August 20, 2026
**Scope:** this policy applies **only to the Estilo web panel** (https://appestilo.co). The mobile application **does not use cookies**.

> This is an English translation provided for convenience and for app store review purposes. In case of any discrepancy, the Spanish version ([politica-de-cookies.md](../politica-de-cookies.md)) prevails.

---

## 1. Responsible party

**RC Studio** — Brayan Richer Claros Díaz
National ID (cédula) 1.123.802.892
Calle 19 # 37K 03, Marsella, Villavicencio, Meta, Colombia
Email: richerclarosdiaz@gmail.com

## 2. What are cookies?

A **cookie** is a very small text file that a website stores in your browser when you visit it. On each later visit, the browser sends that information back to the site, which allows it to remember things such as the fact that you are already signed in.

Alongside cookies there are equivalent technologies that also store information in your browser:

- **`localStorage`**: stores data in the browser with no automatic expiration, until the site or you clear it.
- **`sessionStorage`**: stores data that is deleted when the tab is closed.

The Estilo web panel mainly uses **`localStorage`**, not server cookies. This policy covers both technologies, since they serve the same function and grant you the same rights.

## 3. Cookies and storage we use

We use **essential storage only**, indispensable for the panel to work.

| Name | Type | Purpose | Duration |
|---|---|---|---|
| `estilo-auth` | `localStorage` (essential) | Stores your **JWT session token** and basic profile data (name, role) to keep you authenticated while navigating between panel sections. Without it you would have to sign in on every page. | Until you sign out or clear your browser data. The token expires automatically according to the server policy. |

That is all. There are no other entries.

### 3.1 Nature of the session token

The stored JWT token:

- Identifies your session to the Estilo backend.
- Has a **short expiration** and is invalidated if you change your password.
- **Does not contain your password.**
- Is sent **only** to Estilo servers, never to third parties.

## 4. Cookies we do NOT use

We want to be explicit about this. The Estilo web panel **does not use**:

- ❌ **Third-party tracking cookies** (Facebook Pixel, TikTok Pixel, LinkedIn Insight or others).
- ❌ **Advertising cookies**, behavioral advertising or remarketing.
- ❌ **Third-party analytics cookies** (Google Analytics, Hotjar, Mixpanel or others).
- ❌ **Profiling cookies** to build a commercial profile of you.
- ❌ **Fingerprinting** or device fingerprinting for advertising purposes.

**We do not sell or share the information stored in your browser with third parties.**

## 5. Legal basis

Since this is **strictly necessary storage** to provide a service you expressly requested (signing in to the panel), your prior consent is not required, in accordance with article 5.3 of Directive 2002/58/EC (ePrivacy) and the guidance of the Superintendence of Industry and Commerce on Law 1581 of 2012.

For this reason the panel **does not display a cookie banner**: there is nothing optional to accept or reject. If we introduce non-essential storage in the future, we will request your explicit consent before enabling it and will update this policy.

## 6. External resources loaded by the panel

The web panel loads typefaces from **Google Fonts** (`fonts.googleapis.com` and `fonts.gstatic.com`) for its visual appearance. This request:

- **Does not install cookies** in your browser.
- Means Google receives your IP address as part of the HTTP request, as happens with any external web resource.
- Does not allow Google to identify you as an Estilo user.

We do not load scripts, pixels or resources from any other third-party domain.

## 7. How to disable or delete storage

You are always in control of what your browser stores.

### 7.1 From Estilo

When you click **"Sign out"** in the panel, we immediately delete the `estilo-auth` entry from your browser.

### 7.2 From your browser

| Browser | Path |
|---|---|
| **Google Chrome** | Settings → Privacy and security → Clear browsing data → *Cookies and other site data* |
| **Mozilla Firefox** | Settings → Privacy & Security → Cookies and Site Data → *Clear Data* |
| **Microsoft Edge** | Settings → Cookies and site permissions → Manage and delete cookies and site data |
| **Safari (macOS)** | Safari → Settings → Privacy → Manage Website Data |
| **Safari (iOS)** | Settings → Safari → Clear History and Website Data |

You may also use private or incognito browsing: when you close the window, all storage is deleted automatically.

### 7.3 Consequence of disabling it

If you block or delete local storage for the Estilo domain, **the panel will sign you out** and you will need to sign in again. The site will not stop working, but you will not be able to stay authenticated between pages.

## 8. Changes to this policy

If we change our use of cookies or storage — especially if we introduce a non-essential category — we will publish the new version at https://appestilo.co/cookies and notify you **30 days in advance**. Each version is identified by a number and a date.

## 9. More information

- [Privacy Policy](./privacy-policy.md)
- [Terms and Conditions](./terms-and-conditions.md)

For questions about this policy: **richerclarosdiaz@gmail.com**

---

*Document version 1.0 — August 20, 2026 — RC Studio*
