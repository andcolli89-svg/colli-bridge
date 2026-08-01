# Colli Bridge 1.1.0 — callback na raiz

Bridge HTTPS para o Colli Marketplace Manager.

## Mudança desta versão

O endereço raiz também recebe o retorno OAuth:

```text
https://colli-bridge.onrender.com
```

Quando a raiz recebe `code`, `state` ou erro do Mercado Livre, encaminha ao programa local. Sem esses parâmetros, continua funcionando como diagnóstico de saúde. O callback antigo continua compatível:

```text
https://colli-bridge.onrender.com/api/ml/callback
```

## Funções

- `GET /`: saúde; com parâmetros OAuth, encaminha ao programa local.
- `GET /api/health`: confirma que o serviço está online.
- `GET /api/ml/callback`: callback alternativo compatível.
- `POST /api/ml/notifications`: recebe notificações do Mercado Livre.
- `GET /api/ml/events`: entrega a fila ao programa, protegida por `COLLI_BRIDGE_KEY`.

## Variáveis no Render

```env
LOCAL_CALLBACK_URL=http://localhost:8795/api/ml/callback
COLLI_BRIDGE_KEY=uma-chave-longa-e-aleatoria
ML_APPLICATION_ID=ID-da-aplicacao-do-Mercado-Livre
```

## Teste recomendado no DevCenter

Cadastre as duas URIs temporariamente:

```text
https://colli-bridge.onrender.com
https://colli-bridge.onrender.com/api/ml/callback
```

No programa, use inicialmente:

```env
ML_REDIRECT_URI=https://colli-bridge.onrender.com
```

A URL de notificações permanece:

```text
https://colli-bridge.onrender.com/api/ml/notifications
```
