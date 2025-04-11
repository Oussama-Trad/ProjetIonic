import bcrypt

hashed = "$2b$12$MrNmm16heGAR5x/ZM5uXlOALeGJy/SS4a6N11fos70mlgfgBCGSv6".encode('utf-8')
password = "b".encode('utf-8')

if bcrypt.checkpw(password, hashed):
    print("Le mot de passe correspond !")
else:
    print("Le mot de passe NE correspond PAS.")