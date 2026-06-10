from PIL import Image

# Abrir a logo oficial
img = Image.open('public/LOGO OFICIAL.png')

# Criar versões redimensionadas para PWA
sizes = [192, 256, 512]
for size in sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    output = f'public/pwa-icon-{size}.png'
    resized.save(output, 'PNG')
    print(f'✓ Criado: {output} ({size}x{size})')

print('\n✓ Ícones PWA criados com sucesso!')
