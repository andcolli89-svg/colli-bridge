# Colli Bridge 1.0.0

Bridge HTTPS para o Colli Marketplace Manager.

## Funções

- `GET /api/health`: confirma que o serviço está online.
- `GET /api/ml/callback`: recebe o OAuth do Mercado Livre e redireciona ao programa local.
- `POST /api/ml/notifications`: recebe notificações sem exigir uma chave que o Mercado Livre não envia.
- `GET /api/ml/events`: entrega a fila ao programa local, protegida por `COLLI_BRIDGE_KEY`.

## Variáveis no Render

```env
LOCAL_CALLBACK_URL=http://localhost:8795/api/ml/callback
COLLI_BRIDGE_KEY=uma-chave-longa-e-aleatoria
ML_APPLICATION_ID=ID-da-aplicacao-do-Mercado-Livre
```

Use a mesma `COLLI_BRIDGE_KEY` no `.env` do programa instalado.

## URLs no DevCenter

Redirect URI:

```text
https://colli-bridge.onrender.com/api/ml/callback
```

Notificações:

```text
https://colli-bridge.onrender.com/api/ml/notifications
```

Não coloque a chave na URL pública de notificações.
