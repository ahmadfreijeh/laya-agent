# Host Relay on a VPS

One Ubuntu box. Python holds **Laya**. Node is the public site. Nginx + HTTPS sit in front. Python stays on localhost.

Replace these two values everywhere they appear:

```bash
export DOMAIN=chat.example.com
export APP=/opt/laya-imp
```

`DOMAIN` is the hostname visitors type. `APP` is where the repo lives on the VPS.

Steps marked **Required** are the path that ends with `https://$DOMAIN` working. Steps marked **Optional** can wait.

---

## 1. Box size — Required

CPU-only is enough. GPU is optional.

| | Minimum | Safer |
|---|---|---|
| OS | Ubuntu 22.04 or 24.04 | same |
| vCPU | 4 | 4–8 |
| RAM | **8 GB** | **16 GB** |
| Disk | 40 GB SSD | 60 GB SSD |
| GPU | none | T4 / L4 if you want ~30 ms instead of ~200–500 ms |

4 GB RAM is too small. The model is ~800 MB on disk and usually **2.5–4 GB in RAM**, plus PyTorch, Node, and the OS.

Do **not** run several uvicorn workers. Each worker loads its own copy of Laya.

---

## 2. Point the domain — Required (for SSL)

At your DNS host, add an **A** record:

| Type | Name | Value |
|---|---|---|
| A | `chat` (or `@` for the root) | your VPS public IPv4 |

Wait until it resolves:

```bash
dig +short $DOMAIN
```

That must print the VPS IP before you request a certificate.

**Optional:** add `www` as a second A (or CNAME) if you also want `www.$DOMAIN`.

---

## 3. SSH in and install packages — Required

```bash
sudo apt update
sudo apt install -y git curl build-essential python3 python3-venv python3-pip nginx certbot python3-certbot-nginx ufw
```

Ubuntu’s Node is often too old. Install Node 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

---

## 4. Clone and install the app — Required

```bash
sudo mkdir -p $APP
sudo chown "$USER:$USER" $APP
git clone https://github.com/ahmadfreijeh/laya-agent.git $APP
```

Use your real repo URL. If the code is already on the box, skip `git clone`.

**Python**

```bash
cd $APP/python
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

`HF_TOKEN` in `python/.env` is **optional**. The public `convaiinnovations/laya` checkpoint does not need it.

**Optional:** keep the Hugging Face cache off the home disk:

```bash
sudo mkdir -p /var/cache/laya-hf
sudo chown "$USER:$USER" /var/cache/laya-hf
echo 'HF_HOME=/var/cache/laya-hf' >> $APP/python/.env
```

**Node**

```bash
cd $APP/node
cp .env.example .env
```

`node/.env` must stay:

```
PORT=3000
LAYA_URL=http://127.0.0.1:8000
```

```bash
npm install
npm run build
```

Ploi NodeJS (PM2): port `3000`, start command `npm start` (runs `node dist/server.js`). Deploy script should `npm install` and `npm run build` in `node/` before Ploi reloads PM2. Do not start a second PM2 app by hand.

---

## 5. Download Laya once — Required

First load pulls ~800 MB. Do it before systemd so boot does not wait on Hugging Face.

```bash
cd $APP/python
source .venv/bin/activate
set -a && source .env && set +a
python -c "import laya; laya.load('convaiinnovations/laya')"
```

Later starts use the local cache. This can take a few minutes.

---

## 6. Smoke test — Required

Two terminals (or two SSH sessions).

```bash
# session 1 — Laya (1–3 minutes the first time)
cd $APP/python
source .venv/bin/activate
uvicorn src.server:app --host 127.0.0.1 --port 8000
```

```bash
# session 2 — agent
cd $APP/node
npm run build
npm start
```

```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:3000/health
```

Both should return `ok`. Then stop those two processes (`Ctrl+C`) and use systemd below.

---

## 7. systemd — Required

Keeps both processes up after reboot.

```bash
sudo tee /etc/systemd/system/laya.service >/dev/null <<EOF
[Unit]
Description=Laya (Python)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP/python
Environment=PATH=$APP/python/.venv/bin:/usr/bin
EnvironmentFile=-$APP/python/.env
ExecStart=$APP/python/.venv/bin/uvicorn src.server:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5
TimeoutStartSec=180

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/relay.service >/dev/null <<EOF
[Unit]
Description=Relay (Node)
After=network.target laya.service
Requires=laya.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP/node
Environment=PATH=/usr/bin
EnvironmentFile=-$APP/node/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now laya.service
sudo systemctl enable --now relay.service
sudo systemctl status laya.service --no-pager
sudo systemctl status relay.service --no-pager
```

`TimeoutStartSec=180` is required because Laya loads weights into RAM on start.

Logs:

```bash
sudo journalctl -u laya.service -f
sudo journalctl -u relay.service -f
```

---

## 8. Firewall — Required

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

That opens 22, 80, and 443. **Do not** open 8000. Python stays on `127.0.0.1`. **Optional:** also leave 3000 closed; nginx talks to it on localhost.

---

## 9. Nginx — Required

HTTP first. Certbot will add TLS in the next step.

```bash
sudo tee /etc/nginx/sites-available/relay >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sfn /etc/nginx/sites-available/relay /etc/nginx/sites-enabled/relay
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Check from the VPS:

```bash
curl -sI -H "Host: $DOMAIN" http://127.0.0.1/health
```

---

## 10. SSL + domain — Required

DNS from step 2 must already resolve.

```bash
sudo certbot --nginx -d $DOMAIN --redirect --agree-tos -m you@$DOMAIN
```

Certbot edits the nginx file, issues the cert, and reloads nginx. Renewals are automatic via a systemd timer:

```bash
sudo certbot renew --dry-run
```

**Optional — also cover www**

```bash
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --agree-tos -m you@$DOMAIN
```

---

## 11. Confirm it is live — Required

```bash
curl -s https://$DOMAIN/health
curl -s https://$DOMAIN/docs
```

Open in a browser:

| URL | What it is |
|---|---|
| `https://$DOMAIN/test` | chat widget page |
| `https://$DOMAIN/docs` | Node API docs |
| `https://$DOMAIN/brain` | question editor (writes files) |
| `https://$DOMAIN/theme` | widget theme (writes files) |
| `https://$DOMAIN/widget.js` | embed script |

Embed on another site:

```html
<script src="https://YOUR_DOMAIN/widget.js" defer></script>
```

Node already allows any origin for the widget.

---

## 12. Lock down /brain and /theme — Optional (recommended)

Those pages write `python/questions/` and `node/data/widget-theme.json`. On a public VPS, put a password on them.

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-relay admin
```

Then replace the `location /` block in `/etc/nginx/sites-available/relay` with:

```nginx
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /brain {
        auth_basic "Relay admin";
        auth_basic_user_file /etc/nginx/.htpasswd-relay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /theme {
        auth_basic "Relay admin";
        auth_basic_user_file /etc/nginx/.htpasswd-relay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`/agent`, `/test`, and `/widget.js` stay public.

---

## Day-to-day commands

```bash
# restart after a git pull
cd $APP && git pull
cd $APP/python && source .venv/bin/activate && pip install -r requirements.txt
cd $APP/node && npm install && npm run build
sudo systemctl restart laya.service
sudo systemctl restart relay.service

# logs
sudo journalctl -u laya.service -n 100 --no-pager
sudo journalctl -u relay.service -n 100 --no-pager
```

---

## If something fails

| Symptom | What to check |
|---|---|
| `laya.service` killed / OOM | RAM is under 8 GB, or you started more than one uvicorn worker |
| `laya.service` timeout | first load is still downloading; run step 5, then restart |
| Node `502` / “Laya cannot be reached” | `sudo systemctl status laya.service` and `curl -s http://127.0.0.1:8000/health` |
| Certbot cannot verify | `dig +short $DOMAIN` must be this VPS; ports 80 and 443 must be open |
| `/brain` save fails | the systemd `User` must own `$APP/python/questions` and `$APP/node/data` |
| Site is HTTP only | step 10 did not run, or nginx still has the default site |

```bash
# ownership if saves fail
sudo chown -R "$USER:$USER" $APP/python/questions $APP/node/data
```
