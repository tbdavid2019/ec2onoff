# EC2 Instance Web Controller

[English](#english) | [繁體中文](#繁體中文)

---

<br>
<br>

<h2 id="english">🇬🇧 English</h2>

A lightweight, secure, and modern web application to allow non-technical team members to start and stop a specific AWS EC2 instance. It features a password-less OTP email login system and tracks usage logs using a SQLite database.

### 🌟 Features
*   **Simple & Beautiful UI**: A clean dashboard built with vanilla HTML/CSS/JS without heavy frontend frameworks.
*   **Password-less Authentication**: Uses a Whitelist + Email One-Time Password (OTP) login mechanism.
*   **AWS Integration**: Instantly check status, start, or stop an EC2 instance.
*   **Action Logging**: Built-in SQLite database records who started/stopped the instance, the timestamp, and automatically calculates the *uptime duration*.
*   **Containerized**: Easy to deploy with Docker.

### 🛠️ Tech Stack
*   **Backend**: Node.js, Express
*   **Frontend**: HTML, CSS, JavaScript
*   **Database**: SQLite
*   **AWS SDK**: `@aws-sdk/client-ec2`

### 🚀 Quick Start (Docker Deployment)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ec2onoff
   ```

2. **Configure Environment Variables**
   Rename `.env.example` to `.env` (or create a new `.env` file) and fill in your details:
   ```env
   PORT=3000

   # Authentication Whitelist (Comma separated)
   WHITELIST_EMAILS=user1@company.com,user2@company.com

   # SMTP Configuration (For sending OTP emails)
   SMTP_HOST=smtp.gmail.com  # or your own SMTP server
   SMTP_PORT=465
   SMTP_USER=your-email@company.com
   SMTP_PASS=your-app-password

   # AWS Credentials (Needs to have ec2:StartInstances, ec2:StopInstances, ec2:DescribeInstances permissions)
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```
   *(Note: You will also need to update the `REGION` and `INSTANCE_ID` hardcoded in `awsService.js` to match your target EC2 instance.)*

3. **Build & Run with Docker**
   ```bash
   # Create a logs directory for SQLite persistence
   mkdir -p logs

   # Build the image
   docker build -t ec2-controller .

   # Run the container
   docker run -d \
     -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/logs:/app/logs \
     --name ec2-controller-app \
     ec2-controller
   ```

4. **Access the App**
   Open your browser and navigate to `http://localhost:3000` (or your server's IP/Domain).

---

<br>
<br>

<h2 id="繁體中文">🇹🇼 繁體中文</h2>

這是一個輕量、安全且現代化的網頁應用程式，設計初衷是讓「非技術人員」也能夠輕鬆地啟動與關閉指定的 AWS EC2 伺服器。系統內建了無密碼的 Email 驗證碼 (OTP) 登入機制，並透過 SQLite 資料庫保存所有的操作軌跡與開啟時長紀錄。

### 🌟 功能特色
*   **簡潔美觀的介面**: 使用純 HTML/CSS/JS 打造，不依賴肥大的前端框架。
*   **無密碼身分驗證**: 採用「白名單 + Email 拋棄式驗證碼 (OTP)」登入機制，安全又方便。
*   **AWS 無縫整合**: 即時查看 EC2 狀態，一鍵啟動或停止。
*   **操作紀錄與 Uptime 計算**: 內建 SQLite 資料庫，詳細記錄「誰、在何時」開啟或關閉機器，並自動計算此次開啟的總時長。
*   **容器化部署**: 支援 Docker，輕鬆打包與運行。

### 🛠️ 技術棧
*   **後端**: Node.js, Express
*   **前端**: HTML, CSS, JavaScript (Vanilla)
*   **資料庫**: SQLite
*   **AWS 工具**: `@aws-sdk/client-ec2`

### 🚀 快速開始 (使用 Docker 部署)

1. **下載專案**
   ```bash
   git clone <your-repo-url>
   cd ec2onoff
   ```

2. **設定環境變數**
   建立一個 `.env` 檔案，並填入以下必要資訊：
   ```env
   # 網頁服務 Port
   PORT=3000

   # 允許登入的信箱白名單 (用逗號隔開)
   WHITELIST_EMAILS=user1@company.com,user2@company.com

   # SMTP 信件設定 (用來寄送驗證碼)
   SMTP_HOST=smtp.gmail.com  # 或您自有的 SMTP 伺服器
   SMTP_PORT=465
   SMTP_USER=your-email@company.com
   SMTP_PASS=your-app-password

   # AWS 存取金鑰 (必須具備該 EC2 的 Start, Stop, Describe 權限)
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```
   *(請注意：您還需要手動將 `awsService.js` 檔案中的 `REGION` 和 `INSTANCE_ID` 改為您自己要控制的 EC2 區域與 ID。)*

3. **建置與啟動 Docker 容器**
   ```bash
   # 建立 logs 資料夾以保留 SQLite 資料庫檔案
   mkdir -p logs

   # 打包 Docker Image
   docker build -t ec2-controller .

   # 啟動容器
   docker run -d \
     -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/logs:/app/logs \
     --name ec2-controller-app \
     ec2-controller
   ```

4. **開啟網頁**
   打開瀏覽器並前往 `http://localhost:3000` (如果部署在雲端則是 `http://<您的IP>:3000`) 即可開始使用。
