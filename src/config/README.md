🔑 FIREBASE SERVICE ACCOUNT SETUP
================================

File Location: d:\salman\ludo-project\ludo\src\config\firebase-service-account.json
Status: ⏳ WAITING FOR YOUR JSON CONTENT

STEPS TO GET THE FILE:
======================

1. Go to Firebase Console
   → https://console.firebase.google.com/

2. Select Your Project
   → Click on "ludo-c1bc3"

3. Open Project Settings
   → Click gear icon ⚙️ (top right)
   → Select "Project Settings"

4. Go to Service Accounts Tab
   → You'll see three tabs: General, Users and permissions, Service Accounts
   → Click "Service Accounts"

5. Click "Generate New Private Key"
   → A blue button labeled "Generate New Private Key"
   → Click it
   → A JSON file will download automatically
   → It will be named something like: "ludo-c1bc3-xxxxxxxxxxxxx.json"

6. Copy the Entire JSON Content
   → Open the downloaded JSON file with Notepad
   → Select All (Ctrl+A)
   → Copy (Ctrl+C)

7. Send Me the Content
   → Paste the entire JSON content in the chat
   → I will save it to: firebase-service-account.json
   → Done! ✅


WHAT THE FILE LOOKS LIKE:
=========================

It's a JSON file with these fields:
{
  "type": "service_account",
  "project_id": "ludo-c1bc3",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...",
  "client_email": "firebase-adminsdk-xxxxx@ludo-c1bc3.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/..."
}


AFTER YOU SEND THE JSON:
========================

1. I will save it to the correct location
2. Restart backend server:
   
   Get-Process -Name node | Stop-Process -Force
   cd d:\salman\ludo-project\ludo
   npm run build
   npm start

3. Check logs for:
   ✅ Firebase Admin SDK initialized successfully for FCM

4. Notifications will work! 🎉


SECURITY NOTE:
==============
⚠️  NEVER commit this file to Git!
✅  Already in .gitignore (hopefully)
✅  This key has full admin access to Firebase
✅  Keep it private!


READY?
======
Download the JSON file from Firebase Console and send me the content!
