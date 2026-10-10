Ekti Centralized Multi-Server Management SaaS toiri korar jonno **Master-Worker Architecture** bebohar korte hobe. Ekhane ekte central Master Server thakbe jeti frontend abong main database control korbe, abong proti remote Linux VPS e ekte choto Worker Node (background agent) run korbe.

## System Architecture abong Core Flow

**1. Master Server (Control Plane)**

* **Frontend:** Next.js 15 abong Tailwind CSS bebohar kore admin abong user dashboard toiri hobe.
* **Backend API:** Node.js abong Express bebohar kore main API toiri hobe. Eta user authentication, server registry, abong domain mapping control korbe.
* **Database:** MongoDB bebohar kora hobe jekhane Super Admin, User, Server list, abong Domain er data save thakbe.
* **Super Admin Seeding:** Node.js backend start howar somoy `.env` file theke `SUPER_ADMIN_EMAIL` abong `SUPER_ADMIN_PASS` read kore database e automatic seed account toiri korbe.

**2. Remote Server (Worker Node / Agent)**

* Proti remote server e Node.js abong Express diye toiri ekte choto Agent API run korbe (PM2 bebohar kore).
* Ei Agent API ti server e root/sudo permission e run korbe, jate eta Linux user toiri kora abong Nginx file edit korar khomota rakhe.
* Master server kono command dile (jemon: notun user toiri, domain add), Master server ei remote Agent ke API call korbe, abong Agent ti locally sei command execute korbe.

## Feature Implementation Strategy

* **Multi-Server Management & Health Check:** Master server er background e ekte cron job ba `setInterval` thakbe, jeta proti 1 minute e remote server gulor Agent API te ekte `/health` endpoint e ping korbe. Response asle "Online", na asle "Offline" dekhabe.
* **Automated Domain Connection:** User jokhon panel theke domain add korbe, Master server remote Agent ke data pathabe. Agent API automatically `/etc/nginx/conf.d/` folder e oi user er domain er jonno ekte `.conf` file toiri korbe abong `child_process` bebohar kore `sudo systemctl reload nginx` command run korbe. Ete normal user der kono admin access lagbe na.
* **User File Isolation (Privacy):** Keu jate karo file dekhte na pare, tar jonno jokhon Master server theke notun user toiri kora hobe, remote Agent Linux e `useradd -m <username>` command run korbe abong directory permission `chmod 700 /home/<username>` set kore dibe. Ete ek user onno user er home directory access korte parbe na.

## Project Directory Structure

**Master Server (Next.js + Express):**

```text
/saas-master
├── /frontend (Next.js 15, Tailwind)
│   ├── /app (Admin & User Dashboards)
│   ├── /components (UI elements)
│   └── /lib (API callers)
├── /backend (Express, MongoDB)
│   ├── /controllers (Auth, Server, Domain logic)
│   ├── /models (Mongoose schemas)
│   ├── /routes (API endpoints)
│   └── server.js (Seed logic & Express setup)
└── .env (SUPER_ADMIN_EMAIL, JWT_SECRET, etc.)

```

**Remote Agent (Node.js Express):**

```text
/remote-agent
├── /scripts (Bash scripts for user creation, Nginx reload)
├── /routes (Receive commands from Master)
├── agent.js (Express server running on PM2)
└── .env (AGENT_API_KEY, MASTER_IP)

```

## Security Requirements

* **Agent Authentication:** Remote Agent guloke secure rakhte hobe jate je keu API call korte na pare. Master abong Agent er majhe communication er jonno strong `AGENT_API_KEY` ba Mutual TLS (mTLS) bebohar korte hobe.
* **Rate Limiting:** Next.js frontend abong Express backend e `express-rate-limit` bebohar korte hobe jate brute-force attack na hoy.
* **Input Validation:** Domain name ba username e jate kono malicious script ba shell injection na thake, tar jonno `zod` ba `joi` diye strict validation korte hobe.

Apni ki remote server e user der app run koranor jonno PM2 bebohar korben, naki proti user er jonno alada Docker container toiri korar kotha vabchen?