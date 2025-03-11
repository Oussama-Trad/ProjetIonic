import bcrypt
password = "sophie123"  # Mot de passe pour Sophie
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(hashed)