```
// Create User
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email": "artur@polkadot.education", "password": "artur123", "name": "Artur Gontijo"}' \
  http://0.0.0.0:4000/user | jq .

// Get User
curl -X GET \
  -H 'Content-Type: application/json' \
  http://0.0.0.0:4000/user?userId=66a0413645c44de68c1307a1 | jq .

// Delete User
curl -X DELETE \
  -H 'Content-Type: application/json' \
  -d '{"email": "artur@polkadot.education"}' \
  http://0.0.0.0:4000/user | jq .
```
