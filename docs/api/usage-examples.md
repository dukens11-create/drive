# API Usage Examples

## Authentication
### cURL
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rider@example.com","password":"Passw0rd!"}'
```

### JavaScript (fetch)
```js
const res = await fetch('http://localhost:8080/api/rides/estimate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `******
  },
  body: JSON.stringify({
    pickup: { lat: 37.7749, lng: -122.4194 },
    dropoff: { lat: 37.784, lng: -122.4075 },
    rideType: 'standard'
  })
});
const data = await res.json();
```

### Python (requests)
```python
import requests

response = requests.post(
    'http://localhost:8080/api/support/create-ticket',
    headers={
        'Authorization': f'******',
        'Content-Type': 'application/json'
    },
    json={
        'subject': 'Refund request',
        'category': 'payments',
        'message': 'Charge mismatch on ride ride_123'
    }
)
print(response.status_code, response.json())
```

## Pagination
Use body/query keys:
- `page` (1-based)
- `limit` (max 100)
- `sortBy`, `sortOrder`

## Filtering and sorting
Supported on list endpoints (`/history`, `/list-*`, `/markets`, `/alerts`) using request JSON filters and optional sort keys.
