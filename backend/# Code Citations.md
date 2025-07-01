# Code Citations

## License: GPL_3_0
https://github.com/Nassim-Saboundji/fast-api-security/tree/21d4fe3320e3bf63e1ab1e370ba78ef7404da369/main.py

```
status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("
```


## License: unknown
https://github.com/Filoenna/fast_api_lib/tree/4a34addbe862559b0c1cf48e869d08f53e54ab7d/app/core/security.py

```
"Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username
```

