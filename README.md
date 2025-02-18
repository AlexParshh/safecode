# Safe Code Evaluator Test Cases

## Test Cases

### 1. Return Value Only (No Logs)
Tests execution with only a return value, no print statements.
```bash
curl -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d '{
        "code": "result = sum(map(lambda item: item[\"price\"] * item[\"qty\"], items)) * discount_rate",
        "language": "python",
        "scope": {
            "items": [{"price": 100, "qty": 2}, {"price": 50, "qty": 1}],
            "discount_rate": 0.9
        }
    }'
```

### 2. Error Only (No Logs)
Tests error handling when using undefined variables.
```bash
curl -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d '{
        "code": "result = price * quantity * tax_rate",
        "language": "python",
        "scope": {
            "price": 100
        }
    }'
```

### 3. Logs and Return Value
Tests both print statements and return value.
```bash
curl -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d '{
        "code": "print(\"Starting calculation...\")\nsubtotal = sum(map(lambda item: item[\"price\"] * item[\"qty\"], items))\nprint(f\"Subtotal calculated: {subtotal}\")\nprint(f\"Applying discount rate: {discount_rate}\")\nfinal_price = subtotal * discount_rate\nprint(f\"Final price after discount: {final_price}\")\nreturn final_price",
        "language": "python",
        "scope": {
            "items": [{"price": 100, "qty": 2}, {"price": 50, "qty": 1}],
            "discount_rate": 0.9
        }
    }'
```

### 4. Logs and Error
Tests capturing logs before an error occurs.
```bash
curl -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d '{
        "code": "print(\"Starting calculation...\")\nprint(f\"Price is: {price}\")\nprint(\"Calculating total...\")\nresult = price * quantity * discount",
        "language": "python",
        "scope": {
            "price": 100
        }
    }'
```
